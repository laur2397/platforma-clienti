import fs from 'node:fs';
import path from 'node:path';

export type CentralizatorData = {
  cui: string;
  denumire_firma: string;
  a_avut_firma: 'Da' | 'Nu';
  administrator: string;
  cnp: string;
  email: string;
  telefon: string;
  activitate: string;
  localitate_judet: string;
  cofinantare_procent: number;
  punctaj_cofinantare: number;
  mentinere_locuri_munca_luni: number;
  punctaj_mentinere: number;
  suma_forfetara_80000_lei: string;
  observatii_oferte: string;
  fisier_ci: string | null;
  fisiere_oferte: string[];
  alte_fisiere: string[];
  data_transmiterii: string;
};

export function writeJSON(file: string, data: CentralizatorData) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/\r?\n/g, ' ');
  if (s.includes(',') || s.includes('"') || s.includes(';')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function writeCSV(file: string, data: CentralizatorData) {
  const rows: [string, string][] = [
    ['CUI', data.cui],
    ['Denumire firmă', data.denumire_firma],
    ['A mai avut firmă (asociat/administrator)', data.a_avut_firma],
    ['Nume administrator', data.administrator],
    ['CNP', data.cnp],
    ['Email', data.email],
    ['Telefon', data.telefon],
    ['Activitate propusă', data.activitate],
    ['Localitate / Județ', data.localitate_judet],
    ['Cofinanțare (%)', String(data.cofinantare_procent)],
    ['Punctaj cofinanțare', String(data.punctaj_cofinantare)],
    ['Menținere locuri de muncă (luni)', String(data.mentinere_locuri_munca_luni)],
    ['Punctaj menținere', String(data.punctaj_mentinere)],
    ['Sumă forfetară (max 80.000 lei)', data.suma_forfetara_80000_lei],
    ['Observații oferte', data.observatii_oferte],
    ['Fișier CI', data.fisier_ci ?? ''],
    ['Fișiere oferte', data.fisiere_oferte.join(' | ')],
    ['Alte fișiere', data.alte_fisiere.join(' | ')],
    ['Data transmiterii', data.data_transmiterii],
  ];
  const lines = ['Camp,Valoare', ...rows.map(([k, v]) => `${csvEscape(k)},${csvEscape(v)}`)];
  fs.writeFileSync(file, lines.join('\n'), 'utf-8');
}

export function writeCentralizatorTxt(file: string, data: CentralizatorData) {
  const lines: string[] = [
    'CENTRALIZATOR DOSAR – START-UP NATION',
    '======================================',
    '',
    `Data transmiterii: ${data.data_transmiterii}`,
    '',
    '— DATE FIRMĂ —',
    `CUI: ${data.cui}`,
    `Denumire firmă: ${data.denumire_firma}`,
    `A mai avut firmă (asociat/administrator): ${data.a_avut_firma}`,
    '',
    '— DATE ADMINISTRATOR —',
    `Nume: ${data.administrator}`,
    `CNP: ${data.cnp}`,
    `Email: ${data.email}`,
    `Telefon: ${data.telefon}`,
    '',
    '— ACTIVITATE —',
    `Activitate propusă: ${data.activitate}`,
    `Localitate / Județ: ${data.localitate_judet}`,
    '',
    '— OPȚIUNI PROIECT —',
    `Cofinanțare: ${data.cofinantare_procent}% (${data.punctaj_cofinantare} puncte)`,
    `Menținere locuri de muncă: ${data.mentinere_locuri_munca_luni} luni (${data.punctaj_mentinere} puncte)`,
    `Sumă forfetară (max 80.000 lei): ${data.suma_forfetara_80000_lei}`,
    '',
    '— OBSERVAȚII —',
    data.observatii_oferte || '(fără observații)',
    '',
    '— FIȘIERE ÎNCĂRCATE —',
    `CI: ${data.fisier_ci ?? '(lipsă)'}`,
    'Oferte:',
    ...(data.fisiere_oferte.length
      ? data.fisiere_oferte.map((f) => `  - ${f}`)
      : ['  (niciuna)']),
    'Alte documente:',
    ...(data.alte_fisiere.length
      ? data.alte_fisiere.map((f) => `  - ${f}`)
      : ['  (niciunul)']),
    '',
  ];
  fs.writeFileSync(file, lines.join('\n'), 'utf-8');
}

export function ensureDirFor(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}
