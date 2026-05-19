import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import db, { type DosarRow } from '@/lib/db';
import { getAdminSession } from '@/lib/session';
import { SUBFOLDERS, getFolderPath, isInside } from '@/lib/files';

export const runtime = 'nodejs';

const SUB_KEYS = new Set(Object.values(SUBFOLDERS));

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
};

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session.userId) return new Response('Neautentificat', { status: 401 });

  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return new Response('ID invalid', { status: 400 });

  const row = db.prepare('SELECT * FROM dosare WHERE id = ?').get(id) as DosarRow | undefined;
  if (!row) return new Response('Dosar inexistent', { status: 404 });

  const url = new URL(req.url);
  const sub = url.searchParams.get('sub') ?? '';
  const name = url.searchParams.get('name') ?? '';

  if (!SUB_KEYS.has(sub as (typeof SUBFOLDERS)[keyof typeof SUBFOLDERS])) {
    return new Response('Subfolder invalid', { status: 400 });
  }
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
    return new Response('Nume fișier invalid', { status: 400 });
  }

  const root = getFolderPath(row.folder_name);
  const target = path.join(root, sub, name);
  if (!isInside(root, target)) {
    return new Response('Cale interzisă', { status: 400 });
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return new Response('Fișier inexistent', { status: 404 });
  }

  const ext = path.extname(target).slice(1).toLowerCase();
  const stream = fs.createReadStream(target);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${name}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
