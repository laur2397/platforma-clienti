import { NextRequest, NextResponse } from 'next/server';
import db, { type DosarRow } from '@/lib/db';
import { getAdminSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session.userId) {
    return NextResponse.json({ ok: false, error: 'Neautentificat' }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();

  let rows: DosarRow[];
  if (q) {
    const like = `%${q}%`;
    rows = db
      .prepare(
        `SELECT * FROM dosare
         WHERE cui LIKE ? OR denumire_firma LIKE ?
         ORDER BY creat_la DESC`,
      )
      .all(like, like) as DosarRow[];
  } else {
    rows = db
      .prepare('SELECT * FROM dosare ORDER BY creat_la DESC')
      .all() as DosarRow[];
  }

  return NextResponse.json({ ok: true, items: rows });
}
