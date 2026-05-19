import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/session';
import db from '@/lib/db';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  let sql = 'SELECT * FROM dosare';
  const params: string[] = [];
  if (q) {
    sql += ' WHERE cui LIKE ? OR denumire_firma LIKE ?';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY rowid DESC';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(sql).all(...params) as any[];

  const data = rows.map((r) => ({
    CUI: r.cui ?? '',
    Denumire: r.denumire_firma ?? '',
    Administrator: r.administrator ?? '',
    Contact: [r.email, r.telefon].filter(Boolean).join(' / '),
    Cofinantare: r.cofinantare != null ? `${r.cofinantare}% (${r.punctaj_cofinantare}p)` : '',
    Mentinere: r.mentinere_luni != null ? `${r.mentinere_luni} luni (${r.punctaj_mentinere}p)` : '',
    Forfetara: r.suma_forfetara ? 'Da' : 'Nu',
    Fisiere: r.nr_fisiere ?? 0,
    Status: r.status ?? '',
    Transmis: r.created_at ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 22 }, { wch: 32 },
    { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 8 },
    { wch: 12 }, { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Centralizator');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="centralizator-${today}.xlsx"`,
    },
  });
}
