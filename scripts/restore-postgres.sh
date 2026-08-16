#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then echo "Usage: $0 backups/cuvee-TIMESTAMP.dump" >&2; exit 2; fi
backup="$1";test -f "$backup";directory="$(cd "$(dirname "$backup")"&&pwd)";name="$(basename "$backup")"
if [ -f "$backup.sha256" ];then
  (cd "$directory" && if command -v sha256sum >/dev/null 2>&1; then sha256sum -c "$name.sha256"; else shasum -a 256 -c "$name.sha256"; fi)
fi

restore_args="--clean --if-exists --no-owner --no-acl"
if [ -n "${DATABASE_URL:-}" ]; then
  # Managed / remote PostgreSQL: restore directly with the connection string.
  pg_restore --dbname="$DATABASE_URL" $restore_args "$backup"
elif [ -n "${PGDATABASE:-}" ] || [ -n "${PGHOST:-}" ]; then
  # Libpq environment (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE) is set.
  pg_restore $restore_args "$backup"
else
  # Local compose stack fallback.
  cat "$backup" | docker compose exec -T postgres pg_restore --dbname=cuvee $restore_args
fi
echo "Restore completed from $backup"
