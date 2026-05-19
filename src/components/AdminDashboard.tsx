'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DosarRow } from '@/lib/db';

const STATUS_COLORS: Record<string, string> = {
    'Primit': 'bg-slate-100 text-slate-700',
    'În verificare': 'bg-amber-100 text-amber-800',
    'Lipsesc documente': 'bg-orange-100 text-orange-800',
    'Complet': 'bg-emerald-100 text-emerald-800',
    'Respins intern': 'bg-red-100 text-red-700',
};

function fmtDate(iso: string): string {
    try {
          const d = new Date(iso);
          return d.toLocaleString('ro-RO');
    } catch {
          return iso;
    }
}

export default function AdminDashboard({ username }: { username: string }) {
    const router = useRouter();
    const [items, setItems] = useState<DosarRow[]>([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

  async function load(search = '') {
        setLoading(true);
        setErr(null);
        try {
                const res = await fetch(
                          `/api/admin/dosare${search ? `?q=${encodeURIComponent(search)}` : ''}`,
                  { cache: 'no-store' },
                        );
                const data = await res.json();
                if (!res.ok || !data.ok) {
                          setErr(data.error ?? 'Eroare la incarcare.');
                          return;
                }
                setItems(data.items);
        } catch {
                setErr('Eroare de retea.');
        } finally {
                setLoading(false);
        }
  }

  useEffect(() => {
        load('');
  }, []);

  async function logout() {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.push('/admin/login');
        router.refresh();
  }

  function search(e: React.FormEvent) {
        e.preventDefault();
        load(q.trim());
  }

  async function exportWord() {
    try {
      const url=`/api/admin/export-word${q?`?q=${encodeURIComponent(q)}`:''}`;
      const res=await fetch(url);
      if(!res.ok){alert('Eroare la generarea raportului Word.');return;}
      const blob=await res.blob();
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`raport-dosare-${new Date().toISOString().slice(0,10)}.docx`;
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch{alert('Eroare la export.');}
  }
  function exportCSV() {
        const headers = [
                'Nr. crt.',
                'CUI',
                'Denumire firma',
                'Administrator',
                'CNP',
                'Email',
                'Telefon',
                'Activitate',
                'Localitate/Judet',
                'A avut firma anterior',
                'Cofinantare %',
                'Punctaj cofinantare',
                'Mentinere (luni)',
                'Punctaj mentinere',
                'Suma forfetara',
                'Observatii oferte',
                'Nr. fisiere',
                'Nr. oferte',
                'Status',
                'Data transmiterii',
              ];

      function esc(v: string | number | null | undefined): string {
              if (v == null) return '""';
              const s = String(v).replace(/"/g, '""');
              return `"${s}"`;
      }

      const rows = items.map((it, i) =>
              [
                        i + 1,
                        esc(it.cui),
                        esc(it.denumire_firma),
                        esc(it.administrator),
                        esc(it.cnp),
                        esc(it.email),
                        esc(it.telefon),
                        esc(it.activitate),
                        esc(it.localitate_judet),
                        it.a_avut_firma ? '"Da"' : '"Nu"',
                        it.cofinantare,
                        it.punctaj_cofinantare,
                        it.mentinere_luni,
                        it.punctaj_mentinere,
                        esc(it.suma_forfetara),
                        esc(it.observatii_oferte),
                        it.nr_fisiere,
                        it.nr_oferte,
                        esc(it.status),
                        esc(fmtDate(it.creat_la)),
                      ].join(','),
                                 );

      // BOM UTF-8 pentru caractere romanesti corecte in Excel
      const csv = '﻿' + [headers.map(esc).join(','), ...rows].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `raport-dosare-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
  }

  const totals = useMemo(() => {
        const byStatus: Record<string, number> = {};
        for (const it of items) {
                byStatus[it.status] = (byStatus[it.status] ?? 0) + 1;
        }
        return byStatus;
  }, [items]);

  return (
        <div className="mx-auto max-w-6xl px-4 py-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                                <h1 className="text-2xl font-bold text-slate-900">Panou administrator</h1>
                                <p className="text-sm text-slate-500">Autentificat ca: {username}</p>
                      </div>
                      <div className="flex gap-2">
                                <button
                                              onClick={exportWord}
                                              disabled={items.length === 0}
                                              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                              title="Descarca raport Word cu toate dosarele"
                                            >
                                            Export Word
                                </button>
                                <button onClick={logout} className="btn-secondary">Deconectare</button>
                      </div>
              </div>
        
              <form onSubmit={search} className="card mb-4 flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[200px]">
                                <label className="label" htmlFor="q">Cautare dupa CUI sau denumire firma</label>
                                <input
                                              id="q"
                                              className="input"
                                              value={q}
                                              onChange={(e) => setQ(e.target.value)}
                                              placeholder="ex: 12345678 sau EXEMPLU"
                                            />
                      </div>
                      <button className="btn-primary">Cauta</button>
                      <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => {
                                                setQ('');
                                                load('');
                                  }}
                                >
                                Reset
                      </button>
              </form>
        
          {err && (
                  <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                  </div>
              )}
        
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                      <span className="badge bg-slate-100 text-slate-700">Total: {items.length}</span>
                {Object.entries(totals).map(([s, n]) => (
                    <span key={s} className={`badge ${STATUS_COLORS[s] ?? 'bg-slate-100 text-slate-700'}`}>
                      {s}: {n}
                    </span>
                  ))}
              </div>
        
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                            <tr>
                                                          <th className="px-3 py-2">CUI</th>
                                                          <th className="px-3 py-2">Denumire</th>
                                                          <th className="px-3 py-2">Administrator</th>
                                                          <th className="px-3 py-2">Contact</th>
                                                          <th className="px-3 py-2">Cofinantare</th>
                                                          <th className="px-3 py-2">Mentinere</th>
                                                          <th className="px-3 py-2">Forfetara</th>
                                                          <th className="px-3 py-2">Fisiere</th>
                                                          <th className="px-3 py-2">Status</th>
                                                          <th className="px-3 py-2">Transmis</th>
                                                          <th className="px-3 py-2 text-right">Actiuni</th>
                                            </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {loading && (
                        <tr>
                                        <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                                                          Se incarca...
                                        </td>
                        </tr>
                                            )}
                                  {!loading && items.length === 0 && (
                        <tr>
                                        <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                                                          Niciun dosar transmis.
                                        </td>
                        </tr>
                                            )}
                                  {!loading &&
                                                  items.map((it) => (
                                                                    <tr key={it.id} className="hover:bg-slate-50">
                                                                                      <td className="px-3 py-2 font-mono">{it.cui}</td>
                                                                                      <td className="px-3 py-2 font-medium text-slate-900">{it.denumire_firma}</td>
                                                                                      <td className="px-3 py-2">{it.administrator}</td>
                                                                                      <td className="px-3 py-2 text-xs">
                                                                                                          <div>{it.email}</div>
                                                                                                          <div className="text-slate-500">{it.telefon}</div>
                                                                                        </td>
                                                                                      <td className="px-3 py-2">{it.cofinantare}% ({it.punctaj_cofinantare}p)</td>
                                                                                      <td className="px-3 py-2">{it.mentinere_luni} luni ({it.punctaj_mentinere}p)</td>
                                                                                      <td className="px-3 py-2">{it.suma_forfetara}</td>
                                                                                      <td className="px-3 py-2">{it.nr_fisiere} <span className="text-slate-400">({it.nr_oferte} of.)</span></td>
                                                                                      <td className="px-3 py-2">
                                                                                                          <span className={`badge ${STATUS_COLORS[it.status] ?? 'bg-slate-100 text-slate-700'}`}>
                                                                                                            {it.status}
                                                                                                            </span>
                                                                                        </td>
                                                                                      <td className="px-3 py-2 text-xs text-slate-500">{fmtDate(it.creat_la)}</td>
                                                                                      <td className="px-3 py-2 text-right">
                                                                                                          <div className="flex justify-end gap-1">
                                                                                                                                <a href={`/admin/dosar/${it.id}`} className="btn-secondary text-xs">Vezi dosar</a>
                                                                                                                                <a href={`/api/admin/dosar/${it.id}/zip`} className="btn-primary text-xs">ZIP</a>
                                                                                                            </div>
                                                                                        </td>
                                                                    </tr>
                                                                  ))}
                                </tbody>
                      </table>
              </div>
        </div>
      );
}
