#!/bin/sh
set -eu
# Backup → restore round-trip against a reachable PostgreSQL.
#
# Connection comes from DATABASE_URL or libpq env vars
# (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE). Requires psql, pg_dump and
# pg_restore on PATH — the postgres:17-alpine image provides all three.

for tool in psql pg_dump pg_restore; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 2; }
done

backup_dir="$(mktemp -d)"
trap 'rm -rf "$backup_dir"' EXIT
export BACKUP_DIR="$backup_dir"
export BACKUP_RETENTION_DAYS=14

psql -v ON_ERROR_STOP=1 -c "DROP TABLE IF EXISTS backup_roundtrip_test; CREATE TABLE backup_roundtrip_test(id integer PRIMARY KEY, note text);" >/dev/null
psql -v ON_ERROR_STOP=1 -c "INSERT INTO backup_roundtrip_test VALUES (42, 'cuvee backup check');" >/dev/null

backup_out="$backup_dir/backup-output.txt"
sh scripts/backup-postgres.sh >"$backup_out"
dump="$(tail -n 1 "$backup_out")"
test -f "$dump" || { echo "backup file missing: $dump" >&2; exit 1; }
test -f "$dump.sha256" || { echo "checksum file missing: $dump.sha256" >&2; exit 1; }

psql -v ON_ERROR_STOP=1 -c "DROP TABLE backup_roundtrip_test;" >/dev/null

sh scripts/restore-postgres.sh "$dump" >/dev/null

count="$(psql -tAc "SELECT count(*) FROM backup_roundtrip_test WHERE id=42 AND note='cuvee backup check';")"
test "$count" = "1" || { echo "restored row missing (count=$count)" >&2; exit 1; }

echo "Backup/restore round-trip checks passed."
