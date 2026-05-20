'use client';

import { useEffect, useState } from 'react';
import type { DosarRow } from '@/lib/db';

const STATUSES = [
  'Primit',
  'În verificare',
  'Lipsesc documente',
  'Complet',
  'Respins intern',
] as const;

const SUB = {
  date: '01_Date_client',
  ci: '02_CI',
  oferte: '03_Oferte',
  alte: '04_Alte_documente',
  centralizator: '05_Centralizator',
} as const;

type Fisiere = {
  ci: string[];
  oferte: string[];
  alte: string[];
  centralizator: string[];
  date: string[];
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ro-RO');
  } catch {
    return iso;
  }
}

export default function DosarView({ id }: { id: string }) {
  const [dosar, setDosar] = useState<DosarRow | null>(null);
  const [fisiere, setFisiere] = useState<Fisiere | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/dosar/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error ?? 'Eroare');
        return;
      }
      setDosar(data.dosar);
      setFisiere(data.fisiere);
    } catch {
      setErr('Eroare de rețea.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function updateStatus(s: string) {
    if (!dosar) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/dosar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: s }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error ?? 'Eroare la actualizare.');
      } else {
        setDosar({ ...dosar, status: s as DosarRow['status'] });
      }
    } finally {
      setSaving(false);
    }
  }

  function fileLink(sub: string, name: string) {
    const url = `/api/admin/dosar/${id}/file?sub=${encodeURIComponent(sub)}&name=${encodeURIComponent(name)}`;
    return (
      <a key={`${sub}/${name}`} href={url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
        {name}
      </a>
    );
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-6 text-slate-500">Se încarcă…</div>;
  }
  if (err || !dosar || !fisiere) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err ?? 'Dosar inexistent.'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <a href="/admin" className="text-sm text-brand-700 hover:underline">← înapoi la listă</a>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {dosar.denumire_firma}
          </h1>
          <p className="text-sm text-slate-500">
            CUI <span className="font-mono">{dosar.cui}</span> · folder{' '}
            <span className="font-mono">{dosar.folder_name}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/admin/dosar/${id}/zip`} className="btn-primary">Descarcă ZIP</a>
          <a href={`/api/admin/dosar/${id}/centralizator?format=txt`} className="btn-secondary">
            Centralizator TXT
          </a>
          <a href={`/api/admin/dosar/${id}/centralizator?format=csv`} className="btn-secondary">
            CSV
          </a>
          <a href={`/api/admin/dosar/${id}/centralizator?format=json`} className="btn-secondary">
            JSON
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <h2 className="section-title">Date dosar</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Item k="Administrator" v={dosar.administrator} />
            <Item k="CNP" v={dosar.cnp} />
            <Item k="Email" v={dosar.email} />
            <Item k="Telefon" v={dosar.telefon} />
            <Item k="A mai avut firmă" v={dosar.a_avut_firma ? 'Da' : 'Nu'} />
            <Item k="Localitate / Județ" v={dosar.localitate_judet} />
            <Item
              k="Cofinanțare"
              v={`${dosar.cofinantare}% (${dosar.punctaj_cofinantare} puncte)`}
            />
            <Item
              k="Menținere angajați"
              v={`${dosar.mentinere_luni} luni (${dosar.punctaj_mentinere} puncte)`}
            />
            <Item k="Sumă forfetară (max 80.000 lei)" v={dosar.suma_forfetara} />
            <Item k="Data transmiterii" v={fmtDate(dosar.creat_la)} />
          </dl>
          <div className="mt-4">
            <h3 className="label">Activitate propusă</h3>
            <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm">
              {dosar.activitate}
            </p>
          </div>
          {dosar.observatii_oferte && (
            <div className="mt-4">
              <h3 className="label">Observații oferte</h3>
              <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm">
                {dosar.observatii_oferte}
              </p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title">Status</h2>
          <p className="section-help">Stadiul actual al dosarului.</p>
          <div className="space-y-1">
            {STATUSES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="status"
                  checked={dosar.status === s}
                  onChange={() => updateStatus(s)}
                  disabled={saving}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <FilesCard title="Carte de identitate" empty="(nicio CI încărcată)" items={fisiere.ci.map((n) => fileLink(SUB.ci, n))} />
        <FilesCard title="Oferte" empty="(nicio ofertă)" items={fisiere.oferte.map((n) => fileLink(SUB.oferte, n))} />
        <FilesCard title="Date client" empty="(fără fișiere)" items={fisiere.date.map((n) => fileLink(SUB.date, n))} />
        <FilesCard title="Centralizator" empty="(fără fișiere)" items={fisiere.centralizator.map((n) => fileLink(SUB.centralizator, n))} />
        <FilesCard title="Alte documente" empty="(fără fișiere)" items={fisiere.alte.map((n) => fileLink(SUB.alte, n))} />
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="text-sm text-slate-900">{v}</dd>
    </div>
  );
}

function FilesCard({ title, items, empty }: { title: string; items: React.ReactNode[]; empty: string }) {
  return (
    <div className="card">
      <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {items.map((node, i) => (
            <li key={i}>{node}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
