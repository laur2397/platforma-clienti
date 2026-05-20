import { NextRequest } from 'next/server';
import archiver from 'archiver';
import { Readable } from 'node:stream';
import db, { type DosarRow } from '@/lib/db';
import { getAdminSession } from '@/lib/session';
import { getFolderPath } from '@/lib/files';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session.userId) {
    return new Response('Neautentificat', { status: 401 });
  }

  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return new Response('ID invalid', { status: 400 });

  const row = db.prepare('SELECT * FROM dosare WHERE id = ?').get(id) as DosarRow | undefined;
  if (!row) return new Response('Dosar inexistent', { status: 404 });

  const folder = getFolderPath(row.folder_name);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.directory(folder, row.folder_name);
  // Lansăm finalize în background; stream-ul de mai jos îl va consuma.
  archive.finalize().catch((err) => archive.emit('error', err));

  // Convertim Node Readable → Web ReadableStream.
  const webStream = Readable.toWeb(archive) as unknown as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${row.folder_name}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
