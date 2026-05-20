import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/session';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const SYS = `Ești un asistent AI pentru administratorul unei platforme de colectare documente Start-Up Nation.
Ajuți la gestionarea dosarelor: analizezi documente (CI, oferte, acte), verifici completitudinea, rezumi conținut, identifici probleme.
Răspunzi întotdeauna în română. Fii concis și practic.`;

async function getClientFiles(cui: string) {
  const root = path.join(process.cwd(), 'data', 'dosare');
  const files: {name:string;mimeType:string;data:string}[] = [];
  if (!fs.existsSync(root)) return files;
  try {
    const dirs = fs.readdirSync(root).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    for (const dir of dirs) {
      for (const sub of ['02_CI','03_Oferte','04_Alte_documente']) {
        const p = path.join(root, dir, sub);
        if (!fs.existsSync(p)) continue;
        for (const f of fs.readdirSync(p)) {
          if (!f.includes(cui)) continue;
          const fp = path.join(p, f);
          if (fs.statSync(fp).size > 4*1024*1024) continue;
          const ext = path.extname(f).toLowerCase();
          const mime = ext==='.pdf'?'application/pdf':ext==='.png'?'image/png':['.jpg','.jpeg'].includes(ext)?'image/jpeg':'';
          if (!mime) continue;
          files.push({name:f, mimeType:mime, data:fs.readFileSync(fp).toString('base64')});
          if (files.length >= 8) return files;
        }
      }
    }
  } catch(e) { console.error('files err',e); }
  return files;
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session.userId) return NextResponse.json({error:'Neautorizat'},{status:401});
  try {
    const { messages, clientCui } = await req.json();
    if (!Array.isArray(messages)) return NextResponse.json({error:'Date invalide'},{status:400});
    const ctxParts: object[] = [];
    if (clientCui) {
            const client = db.prepare('SELECT * FROM dosare WHERE cui = ?').get(clientCui) as Record<string,unknown>|undefined;
      if (client) {
        ctxParts.push({text:`DATE CLIENT:\nCUI: ${client.cui}\nDenumire: ${client.denumire}\nAdministrator: ${client.administrator}\nContact: ${client.contact}\nCofinanțare: ${client.cofinantare}%\nMenținere: ${client.mentinere} luni\nForfetare: ${client.forfetare?'Da':'Nu'}\nOferte: ${client.fisiere_oferte}\nDescrieri oferte: ${client.fisiere_oferte_desc||'N/A'}\nStatus: ${client.status||'nou'}\nTransmis: ${client.transmis?'Da':'Nu'}\nUltima actualizare: ${client.updated_at||'N/A'}`});
        const docFiles = await getClientFiles(clientCui);
        if (docFiles.length > 0) {
          ctxParts.push({text:`\nDocumente uploadate (${docFiles.length}):`});
          for (const f of docFiles) {
            ctxParts.push({text:`[${f.name}]`});
            ctxParts.push({inline_data:{mime_type:f.mimeType,data:f.data}});
          }
        } else {
          ctxParts.push({text:'\nNu există documente uploadate încă.'});
        }
      }
    }
    const contents = messages.map((m:{role:string;content:string}, i:number) => {
      const role = m.role==='assistant'?'model':'user';
      const parts: object[] = [];
      if (i===0 && role==='user' && ctxParts.length>0) parts.push(...ctxParts);
      parts.push({text: m.content});
      return {role, parts};
    });
    const body = {
      system_instruction: {parts:[{text:SYS}]},
      contents,
      generationConfig: {temperature:0.7, maxOutputTokens:2048, topP:0.95}
    };
    const gRes = await fetch(GEMINI_URL, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    if (!gRes.ok) { const e=await gRes.text(); console.error('gemini err',e); return NextResponse.json({error:'Eroare AI: '+gRes.status},{status:500}); }
    const data = await gRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nu am putut genera răspuns.';
    return NextResponse.json({response:text});
  } catch(e) { console.error('chat err',e); return NextResponse.json({error:'Eroare internă.'},{status:500}); }
}
