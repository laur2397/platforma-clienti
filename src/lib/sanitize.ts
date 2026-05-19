/**
 * Sanitizează un text pentru a fi folosit ca segment de nume folder / fișier:
 * elimină diacritice, păstrează doar [A-Za-z0-9_-], colapsează spațiile la "_".
 */
const DIACRITIC_RE = /[̀-ͯ]/g; // combining diacritical marks (NFD)
const ROMANIAN_S = /[şș]/g; // ş, ș
const ROMANIAN_T = /[ţț]/g; // ţ, ț

export function sanitizeSegment(input: string): string {
  return input
    .normalize('NFD')
    .replace(DIACRITIC_RE, '')
    .replace(ROMANIAN_S, 's')
    .replace(ROMANIAN_T, 't')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 80);
}

/** CUI: doar cifre (eliminăm prefix "RO" și orice altceva). */
export function sanitizeCui(raw: string): string {
  return raw.replace(/^RO/i, '').replace(/\D+/g, '').slice(0, 12);
}

/** Numele firmei păstrat în formă "umană" dar curat de caractere periculoase. */
export function cleanFirmName(raw: string): string {
  return raw.trim().replace(/[\r\n\t]+/g, ' ').slice(0, 200);
}

/** Generează numele folderului firmei: CUI_DENUMIRE_FIRMA. */
export function buildFolderName(cui: string, denumire: string): string {
  return `${sanitizeCui(cui)}_${sanitizeSegment(denumire)}`;
}

/**
 * Sanitizează numele unui fișier uploadat:
 * - elimină path traversal (../, /, \)
 * - păstrează doar [A-Za-z0-9._-]
 * - limitează lungimea
 */
export function sanitizeFilename(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? 'fisier';
  const cleaned = base
    .normalize('NFD')
    .replace(DIACRITIC_RE, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '');
  return (cleaned || 'fisier').slice(0, 120);
}

export function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx < 0 || idx === filename.length - 1) return '';
  return filename.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
}
