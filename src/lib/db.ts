import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

// În producție (Railway/Fly/etc.) montează un volum persistent și setează
// STORAGE_DIR=/app/storage. Local, fallback la process.cwd().
const STORAGE_ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : process.cwd();

const DATA_DIR = path.join(STORAGE_ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'platforma.db');

// Folosim un singleton în dev pentru a evita reconectările pe HMR.
declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

const db =
  global.__db ??
  (() => {
    const instance = new Database(DB_PATH);
    instance.pragma('journal_mode = WAL');
    instance.pragma('foreign_keys = ON');
    return instance;
  })();

if (process.env.NODE_ENV !== 'production') {
  global.__db = db;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dosare (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_name TEXT NOT NULL UNIQUE,
    cui TEXT NOT NULL,
    denumire_firma TEXT NOT NULL,
    a_avut_firma INTEGER NOT NULL,
    administrator TEXT NOT NULL,
    cnp TEXT NOT NULL,
    email TEXT NOT NULL,
    telefon TEXT NOT NULL,
    activitate TEXT NOT NULL,
    localitate_judet TEXT NOT NULL,
    cofinantare INTEGER NOT NULL,
    punctaj_cofinantare INTEGER NOT NULL,
    mentinere_luni INTEGER NOT NULL,
    suma_forfetara TEXT NOT NULL,
    observatii_oferte TEXT,
    fisier_ci TEXT,
    nr_oferte INTEGER NOT NULL DEFAULT 0,
    nr_fisiere INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Primit',
    creat_la TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_dosare_cui ON dosare(cui);
  CREATE INDEX IF NOT EXISTS idx_dosare_denumire ON dosare(denumire_firma);
`);

export default db;

export const STATUS_VALUES = [
  'Primit',
  'În verificare',
  'Lipsesc documente',
  'Complet',
  'Respins intern',
] as const;
export type Status = (typeof STATUS_VALUES)[number];

export type DosarRow = {
  id: number;
  folder_name: string;
  cui: string;
  denumire_firma: string;
  a_avut_firma: number;
  administrator: string;
  cnp: string;
  email: string;
  telefon: string;
  activitate: string;
  localitate_judet: string;
  cofinantare: number;
  punctaj_cofinantare: number;
  mentinere_luni: number;
  suma_forfetara: string;
  observatii_oferte: string | null;
  fisier_ci: string | null;
  nr_oferte: number;
  nr_fisiere: number;
  status: Status;
  creat_la: string;
};
