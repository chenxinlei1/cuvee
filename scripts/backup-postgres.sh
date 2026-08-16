#!/bin/sh
set -eu
backup_dir="${BACKUP_DIR:-/backups}";retention="${BACKUP_RETENTION_DAYS:-14}";interval="${BACKUP_INTERVAL_SECONDS:-86400}"
backup_once(){ mkdir -p "$backup_dir";timestamp="$(date -u +%Y%m%dT%H%M%SZ)";name="cuvee-$timestamp.dump";target="$backup_dir/$name";pg_dump --format=custom --no-owner --no-acl --file="$target";pg_restore --list "$target" >/dev/null;find "$backup_dir" -type f -name 'cuvee-*.dump' -mtime "+$retention" -delete;(cd "$backup_dir"&&sha256sum "$name" > "$name.sha256");echo "$target"; }
if [ "${BACKUP_LOOP:-false}" = "true" ];then while true;do backup_once;sleep "$interval";done;else backup_once;fi
