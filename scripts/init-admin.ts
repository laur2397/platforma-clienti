/**
 * Creează (sau resetează) contul de administrator pe baza variabilelor:
 *   ADMIN_USERNAME, ADMIN_PASSWORD
 *
 * Rulare: npm run init-admin
 */
import bcrypt from 'bcryptjs';
import db from '../src/lib/db';

function loadDotEnv() {
  try {
    // încărcare manuală .env (fără dependență extra)
    const fs = require('node:fs');
    const path = require('node:path');
    const file = path.join(process.cwd(), '.env');
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8') as string;
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, k, vRaw] = m;
      if (process.env[k]) continue;
      let v = vRaw.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  } catch {
    /* opțional */
  }
}

loadDotEnv();

const username = (process.env.ADMIN_USERNAME ?? '').trim();
const password = process.env.ADMIN_PASSWORD ?? '';

if (!username || !password) {
  console.error('Setați ADMIN_USERNAME și ADMIN_PASSWORD în .env (sau ca variabile de mediu).');
  process.exit(1);
}
if (password.length < 8) {
  console.error('ADMIN_PASSWORD trebuie să aibă cel puțin 8 caractere.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);

const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username) as
  | { id: number }
  | undefined;

if (existing) {
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hash, existing.id);
  console.log(`Parola pentru utilizatorul "${username}" a fost actualizată.`);
} else {
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`Utilizator administrator "${username}" creat cu succes.`);
}
