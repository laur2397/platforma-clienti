import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import db, { STATUS_VALUES, type DosarRow, type Status } from '@/lib/db';
import { getAdminSession } from '@/lib/session';
import { getFolderPath, SUBFOLDERS } from '@/lib/files';

export const runtime = 'nodejs';

async function ensureAuth() {
  const session = await getAdminSession();
  if (!session.userId) {
    return NextResponse.json({ ok: false, error: 'Neautentificat' }, { status: 401 });
  }
  return null;
}

function listFiles(folder: string): string[] {
  if (!fs.existsSync(folder)) return [];
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .sort();
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const denied = await ensureAuth();
  if (denied) return denied;

  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, error: 'ID invalid' }, { status: 400 });
  }

  const row = db.prepare('SELECT * FROM dosare WHERE id = ?').get(id) as DosarRow | undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: 'Dosar inexistent' }, { status: 404 });
  }

  const folder = getFolderPath(row.folder_name);
  const fisiere = {
    ci: listFiles(path.join(folder, SUBFOLDERS.ci)),
    oferte: listFiles(path.join(folder, SUBFOLDERS.oferte)),
    alte: listFiles(path.join(folder, SUBFOLDERS.alte)),
    centralizator: listFiles(path.join(folder, SUBFOLDERS.centralizator)),
    date: listFiles(path.join(folder, SUBFOLDERS.date)),
  };

  return NextResponse.json({ ok: true, dosar: row, fisiere });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const denied = await ensureAuth();
  if (denied) return denied;

  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, error: 'ID invalid' }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status;
  if (!status || !(STATUS_VALUES as readonly string[]).includes(status)) {
    return NextResponse.json({ ok: false, error: 'Status invalid' }, { status: 400 });
  }

  const result = db
    .prepare('UPDATE dosare SET status = ? WHERE id = ?')
    .run(status as Status, id);
  if (result.changes === 0) {
    return NextResponse.json({ ok: false, error: 'Dosar inexistent' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
