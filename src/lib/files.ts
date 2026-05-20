import path from 'node:path';
import fs from 'node:fs';
import { getExtension, sanitizeFilename } from './sanitize';

// În producție montează un volum persistent și setează STORAGE_DIR.
// Local, fallback la process.cwd().
const STORAGE_ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : process.cwd();

export const UPLOADS_ROOT = path.join(STORAGE_ROOT, 'uploads');

export const SUBFOLDERS = {
  date: '01_Date_client',
  ci: '02_CI',
  oferte: '03_Oferte',
  alte: '04_Alte_documente',
  centralizator: '05_Centralizator',
} as const;

export const MAX_FILE_SIZE_BYTES = (() => {
  const mb = Number(process.env.MAX_FILE_SIZE_MB ?? 15);
  return (Number.isFinite(mb) && mb > 0 ? mb : 15) * 1024 * 1024;
})();

// Tipuri de fișiere acceptate (împărțite pe tip de upload).
export const ALLOWED_CI = new Set(['pdf', 'jpg', 'jpeg', 'png']);
export const ALLOWED_OFERTA = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']);

// Validare prin "magic bytes" minimă, pentru a opri upload-uri vădit periculoase.
// Nu este o garanție absolută, dar oprește redenumiri simple (ex: .exe → .pdf).
const MAGIC: Record<string, (buf: Buffer) => boolean> = {
  pdf: (b) => b.length >= 4 && b.subarray(0, 4).toString('ascii') === '%PDF',
  jpg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) =>
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47,
  // DOC: ole compound
  doc: (b) =>
    b.length >= 8 &&
    b[0] === 0xd0 &&
    b[1] === 0xcf &&
    b[2] === 0x11 &&
    b[3] === 0xe0,
  // DOCX = ZIP (PK\x03\x04)
  docx: (b) =>
    b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
};

export function isMagicValid(ext: string, buf: Buffer): boolean {
  const check = MAGIC[ext];
  if (!check) return false;
  return check(buf);
}

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getFolderPath(folderName: string): string {
  return path.join(UPLOADS_ROOT, folderName);
}

export function createDosarStructure(folderName: string) {
  const root = getFolderPath(folderName);
  ensureDir(root);
  for (const sub of Object.values(SUBFOLDERS)) {
    ensureDir(path.join(root, sub));
  }
  return root;
}

/**
 * Asigură că `target` este în interiorul `parent` (evită path traversal).
 */
export function isInside(parent: string, target: string): boolean {
  const rel = path.relative(parent, target);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Construiește numele final al fișierului pe baza unui nume original. */
export function buildSafeName(originalName: string, fallbackPrefix = 'FISIER'): string {
  const safe = sanitizeFilename(originalName);
  if (!safe) return `${fallbackPrefix}.bin`;
  return safe;
}

export { getExtension };
