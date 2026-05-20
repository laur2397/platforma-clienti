import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { getAdminSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? '').trim();
  const password = String(body?.password ?? '');

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: 'Completați utilizator și parolă.' },
      { status: 400 },
    );
  }

  const row = db
    .prepare('SELECT id, username, password_hash FROM admin_users WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string } | undefined;

  // Pentru a nu releva existența user-ului folosim mesaj generic.
  if (!row) {
    return NextResponse.json(
      { ok: false, error: 'Date de autentificare invalide.' },
      { status: 401 },
    );
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: 'Date de autentificare invalide.' },
      { status: 401 },
    );
  }

  const session = await getAdminSession();
  session.userId = row.id;
  session.username = row.username;
  await session.save();

  return NextResponse.json({ ok: true });
}
