import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import db from '@/lib/db';
import { FormSchema, punctajCofinantare } from '@/lib/schema';
import {
  buildFolderName,
  sanitizeSegment,
  sanitizeCui,
} from '@/lib/sanitize';
import {
  ALLOWED_CI,
  ALLOWED_OFERTA,
  MAX_FILE_SIZE_BYTES,
  SUBFOLDERS,
  buildSafeName,
  createDosarStructure,
  ensureDir,
  getExtension,
  getFolderPath,
  isMagicValid,
} from '@/lib/files';
import {
  writeCSV,
  writeCentralizatorTxt,
  writeJSON,
  type CentralizatorData,
} from '@/lib/centralizator';

export const runtime = 'nodejs';
// Permite request body-uri mai mari decât default (FormData cu fișiere).
export const maxDuration = 60;

async function fileToBuffer(file: File): Promise<Buffer> {
  const ab = await file.arrayBuffer();
  return Buffer.from(ab);
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Cererea nu a putut fi procesată.' },
      { status: 400 },
    );
  }

  const raw = {
    cui: form.get('cui') ?? '',
    denumireFirma: form.get('denumireFirma') ?? '',
    aAvutFirma: form.get('aAvutFirma') ?? '',
    numeAdmin: form.get('numeAdmin') ?? '',
    cnp: form.get('cnp') ?? '',
    email: form.get('email') ?? '',
    telefon: form.get('telefon') ?? '',
    activitate: form.get('activitate') ?? '',
    localitateJudet: form.get('localitateJudet') ?? '',
    cofinantare: form.get('cofinantare') ?? '',
    mentinereLuni: form.get('mentinereLuni') ?? '',
    sumaForfetara: form.get('sumaForfetara') ?? '',
    observatiiOferte: form.get('observatiiOferte') ?? '',
    acordCorectitudine: form.get('acordCorectitudine') ?? '',
    acordGDPR: form.get('acordGDPR') ?? '',
  };

  const parsed = FormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json(
      { ok: false, error: 'Formularul conține erori.', fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // --- Validare fișiere ---
  const ciFile = form.get('cartIdentitate');
  if (!(ciFile instanceof File) || ciFile.size === 0) {
    return NextResponse.json(
      { ok: false, error: 'Încărcarea cărții de identitate este obligatorie.' },
      { status: 400 },
    );
  }
  if (ciFile.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'Fișierul cărții de identitate depășește dimensiunea maximă.' },
      { status: 400 },
    );
  }
  const ciExt = getExtension(ciFile.name);
  if (!ALLOWED_CI.has(ciExt)) {
    return NextResponse.json(
      { ok: false, error: 'Cartea de identitate trebuie să fie PDF, JPG sau PNG.' },
      { status: 400 },
    );
  }
  const ciBuf = await fileToBuffer(ciFile);
  if (!isMagicValid(ciExt, ciBuf)) {
    return NextResponse.json(
      { ok: false, error: 'Cartea de identitate nu pare a fi un fișier valid.' },
      { status: 400 },
    );
  }

  const oferteFiles = form.getAll('oferte').filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of oferteFiles) {
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Oferta „${f.name}" depășește dimensiunea maximă permisă.` },
        { status: 400 },
      );
    }
    const ext = getExtension(f.name);
    if (!ALLOWED_OFERTA.has(ext)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Tipul fișierului „${f.name}" nu este acceptat. Se acceptă PDF, DOC, DOCX, JPG, PNG.`,
        },
        { status: 400 },
      );
    }
  }
  // verificăm magic bytes după ce am citit listă (pentru a evita citirea inutilă dacă pică mai sus)
  const oferteBuffers: { file: File; buf: Buffer; ext: string }[] = [];
  for (const f of oferteFiles) {
    const ext = getExtension(f.name);
    const buf = await fileToBuffer(f);
    if (!isMagicValid(ext, buf)) {
      return NextResponse.json(
        { ok: false, error: `Fișierul „${f.name}" nu pare a fi un document valid.` },
        { status: 400 },
      );
    }
    oferteBuffers.push({ file: f, buf, ext });
  }

  // --- Pregătire folder ---
  const folderName = buildFolderName(data.cui, data.denumireFirma);
  const existing = db
    .prepare('SELECT id FROM dosare WHERE folder_name = ?')
    .get(folderName) as { id: number } | undefined;
  if (existing) {
    // Pentru MVP refuzăm duplicatele pe același CUI+denumire pentru a evita amestecul de fișiere.
    return NextResponse.json(
      {
        ok: false,
        error:
          'Există deja un dosar transmis pentru această firmă. Vă rugăm să contactați consultantul pentru actualizări.',
      },
      { status: 409 },
    );
  }

  const root = createDosarStructure(folderName);

  // --- Scriere CI ---
  const ciFinalName = `CI_${sanitizeSegment(data.numeAdmin)}.${ciExt}`;
  const ciFullPath = path.join(root, SUBFOLDERS.ci, ciFinalName);
  fs.writeFileSync(ciFullPath, ciBuf);

  // --- Scriere oferte ---
  const oferteSalvate: string[] = [];
  oferteBuffers.forEach((entry, idx) => {
    const safeOriginal = buildSafeName(entry.file.name, 'OFERTA');
    const finalName = `OFERTA_${idx + 1}_${safeOriginal}`;
    const fullPath = path.join(root, SUBFOLDERS.oferte, finalName);
    fs.writeFileSync(fullPath, entry.buf);
    oferteSalvate.push(finalName);
  });

  // --- Construire centralizator ---
  const dataTransmiterii = new Date().toISOString();
  const central: CentralizatorData = {
    cui: sanitizeCui(data.cui),
    denumire_firma: data.denumireFirma,
    a_avut_firma: data.aAvutFirma,
    administrator: data.numeAdmin,
    cnp: data.cnp,
    email: data.email,
    telefon: data.telefon,
    activitate: data.activitate,
    localitate_judet: data.localitateJudet,
    cofinantare_procent: data.cofinantare,
    punctaj_cofinantare: punctajCofinantare(data.cofinantare),
    mentinere_locuri_munca_luni: data.mentinereLuni,
    suma_forfetara_80000_lei: data.sumaForfetara,
    observatii_oferte: data.observatiiOferte ?? '',
    fisier_ci: ciFinalName,
    fisiere_oferte: oferteSalvate,
    alte_fisiere: [],
    data_transmiterii: dataTransmiterii,
  };

  ensureDir(path.join(root, SUBFOLDERS.date));
  ensureDir(path.join(root, SUBFOLDERS.centralizator));
  writeJSON(path.join(root, SUBFOLDERS.date, 'date_client.json'), central);
  writeCSV(path.join(root, SUBFOLDERS.date, 'date_client.csv'), central);
  writeCentralizatorTxt(
    path.join(root, SUBFOLDERS.centralizator, 'centralizator.txt'),
    central,
  );

  // --- Inserare în baza de date ---
  const nrFisiere = 1 + oferteSalvate.length;
  const stmt = db.prepare(`
    INSERT INTO dosare (
      folder_name, cui, denumire_firma, a_avut_firma,
      administrator, cnp, email, telefon,
      activitate, localitate_judet,
      cofinantare, punctaj_cofinantare, mentinere_luni, suma_forfetara,
      observatii_oferte, fisier_ci, nr_oferte, nr_fisiere,
      status, creat_la
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Primit', ?)
  `);

  stmt.run(
    folderName,
    central.cui,
    central.denumire_firma,
    central.a_avut_firma === 'Da' ? 1 : 0,
    central.administrator,
    central.cnp,
    central.email,
    central.telefon,
    central.activitate,
    central.localitate_judet,
    central.cofinantare_procent,
    central.punctaj_cofinantare,
    central.mentinere_locuri_munca_luni,
    central.suma_forfetara_80000_lei,
    central.observatii_oferte,
    central.fisier_ci,
    oferteSalvate.length,
    nrFisiere,
    central.data_transmiterii,
  );

  return NextResponse.json({ ok: true, folder: folderName });
}
