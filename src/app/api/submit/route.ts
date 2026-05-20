import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import db from '@/lib/db';
import { FormSchema, punctajCofinantare, punctajMentinere } from '@/lib/schema';
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
export const maxDuration = 60;

// Migrare coloane noi (ip_address, user_agent, updated_at)
const cols = db.prepare('PRAGMA table_info(dosare)').all() as { name: string }[];
if (!cols.some((c) => c.name === 'ip_address')) {
  db.exec('ALTER TABLE dosare ADD COLUMN ip_address TEXT');
}
if (!cols.some((c) => c.name === 'user_agent')) {
  db.exec('ALTER TABLE dosare ADD COLUMN user_agent TEXT');
}
if (!cols.some((c) => c.name === 'updated_at')) {
  db.exec('ALTER TABLE dosare ADD COLUMN updated_at TEXT');
}

async function fileToBuffer(file: File): Promise<Buffer> {
  const ab = await file.arrayBuffer();
  return Buffer.from(ab);
}

export async function POST(req: NextRequest) {
  const ip_address =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  const user_agent = req.headers.get('user-agent') ?? '';

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

  // --- UPSERT: verifică dacă există dosar cu același CUI ---
  const cuiSanitized = sanitizeCui(data.cui);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingByCui = db.prepare('SELECT id, folder_name FROM dosare WHERE cui = ?').get(cuiSanitized) as any;

  const folderName = existingByCui
    ? existingByCui.folder_name
    : buildFolderName(data.cui, data.denumireFirma);

  const root = existingByCui
    ? getFolderPath(folderName)
    : createDosarStructure(folderName);

  // --- Scriere CI ---
  const ciFinalName = `CI_${sanitizeSegment(data.numeAdmin)}.${ciExt}`;
  const ciFullPath = path.join(root, SUBFOLDERS.ci, ciFinalName);
  fs.writeFileSync(ciFullPath, ciBuf);

  // --- Scriere oferte ---
  const oferteSalvate: string[] = [];
  const oferteDescrieri: string[] = [];
  oferteBuffers.forEach((entry, idx) => {
    const safeOriginal = buildSafeName(entry.file.name, 'OFERTA');
    const finalName = `OFERTA_${idx + 1}_${safeOriginal}`;
    const fullPath = path.join(root, SUBFOLDERS.oferte, finalName);
    fs.writeFileSync(fullPath, entry.buf);
    oferteDescrieri.push(String(form.get("oferte_desc_" + oferteSalvate.length) || ""));
    oferteSalvate.push(finalName);
  });

  // --- Construire centralizator ---
  const dataTransmiterii = new Date().toISOString();
  const central: CentralizatorData = {
    cui: cuiSanitized,
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
    punctaj_mentinere: punctajMentinere(data.mentinereLuni),
    suma_forfetara_80000_lei: data.sumaForfetara,
    observatii_oferte: data.observatiiOferte ?? '',
    fisier_ci: ciFinalName,
    fisiere_oferte: oferteSalvate,
    fisiere_oferte_desc: oferteDescrieri,
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

  const nrFisiere = 1 + oferteSalvate.length;

  if (existingByCui) {
    // UPDATE
    db.prepare(`
      UPDATE dosare SET
        denumire_firma = ?, a_avut_firma = ?, administrator = ?, cnp = ?,
        email = ?, telefon = ?, activitate = ?, localitate_judet = ?,
        cofinantare = ?, punctaj_cofinantare = ?, mentinere_luni = ?, punctaj_mentinere = ?,
        suma_forfetara = ?, observatii_oferte = ?, fisier_ci = ?,
        nr_oferte = ?, nr_fisiere = ?,
        ip_address = ?, user_agent = ?,
        updated_at = datetime('now')
      WHERE cui = ?
    `).run(
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
      central.punctaj_mentinere,
      central.suma_forfetara_80000_lei,
      central.observatii_oferte,
      central.fisier_ci,
      oferteSalvate.length,
      nrFisiere,
      ip_address,
      user_agent,
      cuiSanitized,
    );
  } else {
    // INSERT
    db.prepare(`
      INSERT INTO dosare (
        folder_name, cui, denumire_firma, a_avut_firma,
        administrator, cnp, email, telefon,
        activitate, localitate_judet,
        cofinantare, punctaj_cofinantare, mentinere_luni, punctaj_mentinere, suma_forfetara,
        observatii_oferte, fisier_ci, nr_oferte, nr_fisiere,
        status, creat_la, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Primit', ?, ?, ?)
    `).run(
      folderName,
      cuiSanitized,
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
      central.punctaj_mentinere,
      central.suma_forfetara_80000_lei,
      central.observatii_oferte,
      central.fisier_ci,
      oferteSalvate.length,
      nrFisiere,
      central.data_transmiterii,
      ip_address,
      user_agent,
    );
  }

  return NextResponse.json({ ok: true, folder: folderName });
}
