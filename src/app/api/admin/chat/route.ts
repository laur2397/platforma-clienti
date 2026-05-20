import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAdminSession } from '@/lib/session';
import fs from 'fs';
import path from 'path';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
const SYS = 'Esti un asistent AI pentru administratorul unei platforme de colectare documente Start-Up Nation. Ai acces complet la baza de date si poti vedea imaginile ofertelor incarcate. Ajuti la gestionarea dosarelor: statusuri, IP-uri, dispozitive, oferte. Raspunzi in romana. Fii concis.';

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

function getOfferParts(folderName: string): { textParts: object[], imageParts: object[] } {
  const textParts: object[] = [];
  const imageParts: object[] = [];
  const ofertaDir = path.join(process.cwd(), 'uploads', folderName, '03_Oferte');
  if (!fs.existsSync(ofertaDir)) return { textParts, imageParts };
  const files = fs.readdirSync(ofertaDir);
  if (files.length === 0) {
    textParts.push({text: 'Nicio oferta incarcata.'});
    return { textParts, imageParts };
  }
  textParts.push({text: `Oferte incarcate (${files.length} fisiere): ${files.join(', ')}`});
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      try {
        const filePath = path.join(ofertaDir, file);
        const imgData = fs.readFileSync(filePath);
        const base64 = imgData.toString('base64');
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        imageParts.push({text: `[Imagine: ${file}]`});
        imageParts.push({inline_data: {mime_type: mimeType, data: base64}});
      } catch {
        textParts.push({text: `[Eroare citire ${file}]`});
      }
    }
  }
  return { textParts, imageParts };
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session.userId) return NextResponse.json({error:'Neautorizat'},{status:401});
  try {
    const { messages, clientCui } = await req.json();
    if (!Array.isArray(messages)) return NextResponse.json({error:'Date invalide'},{status:400});
    const isFirstTurn = messages.length === 1;
    let textCtxParts: object[] = [];
    let imageCtxParts: object[] = [];
    if (clientCui) {
      const c = db.prepare('SELECT * FROM dosare WHERE cui = ?').get(clientCui) as Record<string,unknown>|undefined;
      if (c) {
        const ctxText = `DATE CLIENT:\nCUI: ${c.cui}\nDenumire: ${c.denumire_firma}\nAdministrator: ${c.administrator}\nCNP: ${c.cnp}\nEmail: ${c.email}\nTelefon: ${c.telefon}\nActivitate: ${c.activitate}\nLocalitate: ${c.localitate_judet}\nCofinantare: ${c.cofinantare}%\nMentinere: ${c.mentinere_luni} luni\nSuma forfetara: ${c.suma_forfetara||'Nu'}\nStatus: ${c.status||'nou'}\nIP: ${c.ip_address||'N/A'}\nDispozitiv: ${c.user_agent||'N/A'}\nCreat la: ${c.creat_la||'N/A'}\nActualizat: ${c.updated_at||'N/A'}\nNr oferte: ${c.nr_oferte||0}\nNr fisiere: ${c.nr_fisiere||0}\nObservatii: ${c.observatii_oferte||'N/A'}`;
        textCtxParts.push({text: ctxText});
        if (c.folder_name) {
          const { textParts, imageParts } = getOfferParts(c.folder_name as string);
          textCtxParts = textCtxParts.concat(textParts);
          imageCtxParts = imageParts;
        }
      } else {
        textCtxParts.push({text: `Nu exista dosar pentru CUI: ${clientCui}`});
      }
    } else {
      const all = db.prepare('SELECT cui,denumire_firma,status,cofinantare,ip_address,creat_la,nr_oferte FROM dosare ORDER BY creat_la DESC').all() as Record<string,unknown>[];
      const total = all.length;
      const primite = all.filter(d => d.status === 'primit').length;
      const lipsesc = all.filter(d => d.status === 'lipsesc documente').length;
      let ctxText = `TOATE DOSARELE (${total} total, ${primite} primite, ${lipsesc} lipsesc documente):\n`;
      ctxText += all.map(d => `- ${d.denumire_firma} (${d.cui}): status=${d.status||'nou'}, ip=${d.ip_address||'N/A'}, oferte=${d.nr_oferte||0}`).join('\n');
      textCtxParts.push({text: ctxText});
    }
    const contents = messages.map((m:{role:string;content:string}, i:number) => {
      const role = m.role==='assistant'?'model':'user';
      const parts: object[] = [];
      if (i===0 && role==='user' && textCtxParts.length>0) {
        parts.push(...textCtxParts);
        if (isFirstTurn && imageCtxParts.length>0) {
          parts.push(...imageCtxParts);
        }
        parts.push({text: '\n\n'});
      }
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
