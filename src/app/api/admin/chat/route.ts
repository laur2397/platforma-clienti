import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/session';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;
}

function getClientFiles(cui: string): Array<{ mime_type: string; data: string; name: string }> {
  const baseDir = path.join(process.cwd(), 'data', 'dosare');
  const result: Array<{ mime_type: string; data: string; name: string }> = [];
  if (!fs.existsSync(baseDir)) return result;

  const dateFolders = fs.readdirSync(baseDir).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f));
  const subfolders = ['02_CI', '03_Oferte', '04_Alte_documente'];
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
  const maxFiles = 8;
  const maxSize = 4 * 1024 * 1024;

  for (const dateFolder of dateFolders) {
    if (result.length >= maxFiles) break;
    for (const sub of subfolders) {
      if (result.length >= maxFiles) break;
      const dir = path.join(baseDir, dateFolder, sub);
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.includes(cui) && allowed.includes(path.extname(f).toLowerCase()));
      for (const file of files) {
        if (result.length >= maxFiles) break;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.size > maxSize) continue;
        const ext = path.extname(file).toLowerCase();
        const mime = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';
        const data = fs.readFileSync(filePath).toString('base64');
        result.push({ mime_type: mime, data, name: file });
      }
    }
  }
  return result;
}

async function callGeminiWithRetry(url: string, body: object, maxRetries = 3): Promise<any> {
  let lastError = '';
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, attempt * 3000));
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 503 || res.status === 529) {
      const errText = await res.text();
      lastError = `HTTP ${res.status}: ${errText.slice(0, 200)}`;
      console.warn(`Gemini attempt ${attempt + 1}/${maxRetries} failed (${res.status}), retrying...`);
      continue;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 400)}`);
    }
    return await res.json();
  }
  throw new Error(`Modelul AI este supraîncărcat momentan. Încearcă din nou în câteva secunde. (${lastError.slice(0, 100)})`);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });

  try {
    const { messages, cui }: { messages: GeminiMessage[]; cui?: string } = await req.json();

    let systemText = `Ești un asistent administrativ expert pentru o platformă de colectare documente Start-Up Nation.
Ajuți administratorul să gestioneze dosarele clienților, să verifice completitudinea documentelor și sĠ ofere recomandări.
Răspunzi in română. Ești concis i profesionist.`;

    if (cui) {
      const client = (db as any).prepare('SELECT * FROM dosare WHERE cui = ?').get(cui) as any;
      if (client) {
        systemText += `\n\nClient activ: ${client.denumire_firma} (CUI: ${cui})
Telefon: ${client.telefon || 'n/a'} | Email: ${client.email || 'n/a'}
J�deț: ${client.judet || 'n/a'} | Localitate: ${client.localitate || 'n/a'}
Data inregistrare: ${client.created_at || 'n/a'}`;
        const files = getClientFiles(cui);
        systemText += files.length > 0
          ? `\nDocumente disponibile (${files.length}): ${files.map(f => f.name).join(', ')}`
          : `\nNu exista documente incarcate pentru acest client.`;
      }
    }

    const contents: GeminiMessage[] = messages.map((m, i) => {
      if (m.role === 'user' && i === 0 && cui) {
        const files = getClientFiles(cui);
        const parts: GeminiMessage['parts'] = [];
        if (m.parts[0]?.text) parts.push({ text: m.parts[0].text });
        for (const f of files) parts.push({ inline_data: { mime_type: f.mime_type, data: f.data } });
        return { role: 'user', parts: parts.length ? parts : m.parts };
      }
      return m;
    });

    const geminiBody = {
      system_instruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    };

    const data = await callGeminiWithRetry(GEMINI_URL, geminiBody);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Niciun raspuns primit.';
    return NextResponse.json({ text });

  } catch (err: any) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: err?.message || 'Eroare necunoscuta' }, { status: 500 });
  }
}
