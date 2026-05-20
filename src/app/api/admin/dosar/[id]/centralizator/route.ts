import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import db, { type DosarRow } from '@/lib/db';
import { getAdminSession } from '@/lib/session';
import { SUBFOLDERS, getFolderPath } from '@/lib/files';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session.userId) return new Response('Neautentificat', { status: 401 });

  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return new Response('ID invalid', { status: 400 });

  const row = db.prepare('SELECT * FROM dosare WHERE id = ?').get(id) as DosarRow | undefined;
  if (!row) return new Response('Dosar inexistent', { status: 404 });

  const format = new URL(req.url).searchParams.get('format') ?? 'txt';
  const folder = getFolderPath(row.folder_name);

  let file: string;
  let mime: string;
  let download: string;
  if (format === 'json') {
    file = path.join(folder, SUBFOLDERS.date, 'date_client.json');
    mime = 'application/json; charset=utf-8';
    download = `centralizator_${row.folder_name}.json`;
  } else if (format === 'csv') {
    file = path.join(folder, SUBFOLDERS.date, 'date_client.csv');
    mime = 'text/csv; charset=utf-8';
    download = `centralizator_${row.folder_name}.csv`;
  } else {
    file = path.join(folder, SUBFOLDERS.centralizator, 'centralizator.txt');
    mime = 'text/plain; charset=utf-8';
    download = `centralizator_${row.folder_name}.txt`;
  }

  if (!fs.existsSync(file)) {
    return new Response('Centralizator inexistent', { status: 404 });
  }

  const data = fs.readFileSync(file);
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${download}"`,
      'Cache-Control': 'no-store',
    },
  });
}
