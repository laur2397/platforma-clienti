import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminSession } from '@/lib/session';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
const SYS = 'Esti un asistent AI pentru administratorul unei platforme de colectare documente Start-Up Nation. Ai acces complet la baza de date. Ajuti la gestionarea dosarelor: statusuri, IP-uri, dispozitive, oferte. Raspunzi in romana. Fii concis.';

async function callGeminiWithRetry(url: string, body: object, maxRetries = 3): Promise<any> {
  let lastError = '';
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) { await new Promise(r => setTimeout(r, attempt * 3000)); }
    const res = await fetch(url, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body),
    });
    if (res.status === 503 || res.status === 529) { lastError='HTTP '+res.status; continue; }
    if (!res.ok) { throw new Error('Gemini '+res.status+': '+(await res.text()).slice(0,200)); }
    return await res.json();
  }
  throw new Error('AI supraincercat momentan. Incearca din nou. ('+lastError+')');
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session.userId) return NextResponse.json({error:'Neautorizat'},{status:401});
  try {
    const { messages, clientCui } = await req.json();
    if (!Array.isArray(messages)) return NextResponse.json({error:'Date invalide'},{status:400});
    let ctxText = '';
    if (clientCui) {
      const c = db.prepare('SELECT * FROM dosare WHERE cui = ?').get(clientCui) as Record<string,unknown>|undefined;
      if (c) {
        ctxText = `DATE CLIENT:\nCUI: ${c.cui}\nDenumire: ${c.denumire}\nAdministrator: ${c.administrator}\nContact: ${c.contact}\nCofinantare: ${c.cofinantare}%\nMentinere: ${c.mentinere} luni\nForfetare: ${c.forfetare?'Da':'Nu'}\nStatus: ${c.status||'nou'}\nTransmis: ${c.transmis?'Da':'Nu'}\nIP: ${c.ip_address||'N/A'}\nDispozitiv: ${c.user_agent||'N/A'}\nUltima actualizare: ${c.updated_at||'N/A'}\nFisiere oferte: ${c.fisiere_oferte||'niciuna'}\nDescrieri oferte: ${c.fisiere_oferte_desc||'N/A'}`;
      } else { ctxText = `Nu exista dosar pentru CUI: ${clientCui}`; }
    } else {
      const all = db.prepare('SELECT cui,denumire,status,transmis,cofinantare,ip_address,user_agent,created_at,fisiere_oferte FROM dosare ORDER BY created_at DESC').all() as Record<string,unknown>[];
      const total = all.length;
      const primite = all.filter(d => d.status === 'primit').length;
      const lipsesc = all.filter(d => d.status === 'lipsesc documente').length;
      ctxText = `TOATE DOSARELE (${total} total, ${primite} primite, ${lipsesc} lipsesc documente):\n`;
      ctxText += all.map(d => `- ${d.denumire} (${d.cui}): status=${d.status||'nou'}, transmis=${d.transmis?'Da':'Nu'}, ip=${d.ip_address||'N/A'}, oferte=${d.fisiere_oferte||'niciuna'}`).join('\n');
    }
    const contents = messages.map((m:{role:string;content:string}, i:number) => {
      const role = m.role==='assistant'?'model':'user';
      const parts: object[] = [];
      if (i===0 && role==='user' && ctxText) parts.push({text: ctxText+'\n\n'});
      parts.push({text: m.content});
      return {role, parts};
    });
    const body = {
      system_instruction: {parts:[{text:SYS}]},
      contents,
      generationConfig: {temperature:0.7, maxOutputTokens:2048, topP:0.95}
    };
    const data = await callGeminiWithRetry(GEMINI_URL, body);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nu am putut genera raspuns.';
    return NextResponse.json({response:text});
  } catch(e) { console.error('chat err',e); return NextResponse.json({error:'Eroare interna.'},{status:500}); }
}
