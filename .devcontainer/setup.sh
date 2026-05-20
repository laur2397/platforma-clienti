#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "=== 1. Instalare dependențe ==="
npm install --no-audit --no-fund

if [ ! -f .env ]; then
  echo "=== 2. Generare .env (SESSION_SECRET aleator + parolă admin) ==="
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  ADMIN_PASS="Admin$(node -e "console.log(require('crypto').randomBytes(6).toString('hex'))")!"
  cat > .env <<EOF
SESSION_SECRET=$SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASS
MAX_FILE_SIZE_MB=15
NODE_ENV=development
EOF
  cat > .env.credentials <<EOF
==============================================
  CREDENȚIALE ADMIN (notează-le)
==============================================
  URL admin: <URL-codespace>/admin
  Utilizator: admin
  Parolă:     $ADMIN_PASS
==============================================
EOF
else
  echo "=== 2. .env există deja, sar peste generare ==="
fi

echo "=== 3. Inițializare cont admin în SQLite ==="
set -a
. ./.env
set +a
npm run init-admin

if [ -f .env.credentials ]; then
  echo
  cat .env.credentials
  echo
fi

echo "=== 4. Setup complet. Aplicația va porni automat. ==="
