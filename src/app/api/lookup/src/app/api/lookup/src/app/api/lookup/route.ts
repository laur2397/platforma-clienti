import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cui = searchParams.get('cui')?.trim();
  if (!cui) return NextResponse.json({ found: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare('SELECT * FROM dosare WHERE cui = ?').get(cui) as any;
  if (!row) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, data: row });
}
