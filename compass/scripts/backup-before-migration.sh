#!/usr/bin/env bash
set -euo pipefail
DB_PATH="${DATABASE_URL:-./data/compass.db}"
DB_PATH="${DB_PATH#file:}"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="./data/backup-pre-v2-${STAMP}.db"
sqlite3 "$DB_PATH" ".backup $OUT"
echo "Backed up to $OUT"
