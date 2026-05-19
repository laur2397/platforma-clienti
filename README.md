# Platformă colectare documente – Start-Up Nation

MVP web pentru colectarea documentelor de la clienți, pentru proiectele de finanțare
Start-Up Nation. Aplicația oferă:

- **Zona client** (`/`): formular în limba română, cu validare și upload de fișiere
  (CI + oferte), grupate automat pe firmă.
- **Zona administrator** (`/admin`): autentificare cu utilizator/parolă, listare
  dosare, căutare după CUI sau denumire, vizualizare detalii, marcare status,
  descărcare ZIP și centralizator (TXT/CSV/JSON).

## Stack ales

- **Next.js 14** (App Router, TypeScript) — un singur proces servește atât UI-ul
  cât și API-ul, simplu de rulat local și ușor de deployat ulterior.
- **SQLite** (`better-sqlite3`) — zero configurație, suficient pentru un MVP cu
  zeci/sute de dosare. Migrarea ulterioară la Postgres rămâne posibilă pe baza
  aceluiași model.
- **Tailwind CSS** — interfață curată, responsive, fără dependențe vizuale grele.
- **iron-session + bcryptjs** — sesiune admin semnată/criptată în cookie + hash
  bcrypt pentru parole (parolele nu sunt salvate niciodată în clar).
- **Zod** — validare server-side a formularului.
- **archiver** — generare ZIP pentru fiecare dosar.

Fișierele sunt stocate local, în folderul `uploads/`, organizate pe firmă.

## Instalare și rulare locală

```bash
# 1. instalare dependențe
npm install

# 2. configurare .env (copiază exemplul și editează valorile)
cp .env.example .env
#   - schimbă SESSION_SECRET cu o valoare aleatoare (>= 32 caractere)
#   - setează ADMIN_USERNAME și ADMIN_PASSWORD pentru contul tău

# 3. creează contul de admin (folosește variabilele din .env)
npm run init-admin

# 4. pornește aplicația în development
npm run dev
# → http://localhost:3000          formular client
# → http://localhost:3000/admin    panou administrator
```

Pentru un build de producție:

```bash
npm run build
npm start
```

Aplicația este pregătită pentru a fi servită prin HTTPS: cookie-ul de sesiune
devine automat `Secure` când `NODE_ENV=production`.

## Structura folderelor `uploads/`

La fiecare formular transmis, aplicația creează automat:

```
uploads/
└── 12345678_EXEMPLU_SRL/
    ├── 01_Date_client/
    │   ├── date_client.json
    │   └── date_client.csv
    ├── 02_CI/
    │   └── CI_ION_POPESCU.pdf
    ├── 03_Oferte/
    │   ├── OFERTA_1_<nume_original>.pdf
    │   ├── OFERTA_2_<nume_original>.pdf
    │   └── ...
    ├── 04_Alte_documente/   (gol implicit, rezervat pentru completări manuale)
    └── 05_Centralizator/
        └── centralizator.txt
```

## Securitate

- Parolele admin sunt hash-uite cu **bcrypt** (cost 12) și păstrate în SQLite.
- Sesiunea admin este un cookie semnat și criptat (iron-session), `HttpOnly` și
  `SameSite=Lax`, devine `Secure` în producție.
- Endpoint-urile `/api/admin/*` verifică sesiunea înainte de a returna date.
- Upload-urile sunt filtrate prin: extensie, dimensiune maximă (variabilă în
  `.env`, default 15 MB) și o verificare de **magic bytes** (PDF, JPG, PNG,
  DOC, DOCX) — astfel se respinge cazul în care un fișier executabil este
  redenumit `.pdf`.
- Numele fișierelor sunt sanitizate (fără `..`, fără separatori de cale,
  fără caractere periculoase) și descărcarea folosește
  `X-Content-Type-Options: nosniff`.
- Clienții nu au acces la documentele altora — singurul endpoint public este
  `POST /api/submit`, restul rutelor cer sesiune de admin.

## Deploy pe Railway (URL public)

Repo-ul include `railway.json` și suport pentru un singur volum persistent
(prin variabila `STORAGE_DIR`), astfel încât `data/` (SQLite) și `uploads/`
(documente clienți) supraviețuiesc redeploy-urilor.

1. Mergi pe https://railway.com → **Login with GitHub** → autorizează accesul
   la repo-ul `laur2397/platforma-clienti`.
2. **New Project → Deploy from GitHub repo** și alege `platforma-clienti`.
   Railway detectează Next.js și începe primul build (va eșua până nu setezi
   variabilele — e ok).
3. În tab-ul **Variables** adaugă:
   - `SESSION_SECRET` = un string random de **minim 32 caractere** (generează-l
     cu: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `ADMIN_USERNAME` = numele tău de admin (ex. `admin`)
   - `ADMIN_PASSWORD` = parola de admin (min. 8 caractere)
   - `STORAGE_DIR` = `/app/storage`
   - `NODE_ENV` = `production`
   - `MAX_FILE_SIZE_MB` = `15` (opțional)
4. În tab-ul **Settings → Volumes → New Volume**:
   - Mount path: `/app/storage`
   - Lasă size-ul implicit (poți crește ulterior).
5. **Settings → Networking → Generate Domain** ca să primești un URL public
   de forma `platforma-clienti-production.up.railway.app`.
6. Apasă **Deploy** (sau commit nou pe branch). La start, Railway rulează
   automat `npm run init-admin && npm start`, deci contul tău de admin este
   creat/actualizat din variabilele de mediu, fără pași manuali.
7. Acces:
   - Formular client: `https://<domeniul-tau>/`
   - Panou admin: `https://<domeniul-tau>/admin` (login cu `ADMIN_USERNAME` /
     `ADMIN_PASSWORD`).

**Important:** dacă schimbi `ADMIN_PASSWORD` în Variables și redeploy-uiești,
parola contului de admin este sincronizată automat (init-admin rulează la
fiecare pornire și este idempotent).

## Extensii uzuale (după MVP)

- Adăugare câmpuri suplimentare în formular fără modificări de schemă (există
  folderul `04_Alte_documente`).
- Înlocuirea SQLite cu Postgres (schimbi `src/lib/db.ts`).
- Notificare email la transmiterea formularului (de adăugat în `api/submit`).
- Audit log al acțiunilor admin.
