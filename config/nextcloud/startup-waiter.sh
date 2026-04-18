#!/bin/sh
set -eu

WAITER="${HOMEFORGE_WAITER:-/usr/local/bin/wait-for-db.sh}"
OCC="php /var/www/html/occ"
MIGRATION_LOCK="/data/.migration-locks/nextcloud"

"$WAITER" tcp db 3306 90 "Nextcloud MariaDB"

# Check if Nextcloud is installed before attempting any operations
if ! $OCC status --output=json 2>/dev/null | grep -q '"installed":true'; then
  echo "[nextcloud-startup] Nextcloud not installed or occ status unavailable; skipping upgrade"
  exit 0
fi

STATUS_JSON="$($OCC status --output=json 2>/dev/null)"

if echo "$STATUS_JSON" | grep -q '"needsDbUpgrade":true'; then
  echo "[nextcloud-startup] pending upgrade found — acquiring migration lock"
  mkdir -p "$(dirname "$MIGRATION_LOCK")"
  touch "$MIGRATION_LOCK"
  trap 'rm -f "$MIGRATION_LOCK"; echo "[nextcloud-startup] migration lock released"' EXIT
  $OCC upgrade --no-interaction
  rm -f "$MIGRATION_LOCK"
  trap - EXIT
  STATUS_JSON="$($OCC status --output=json 2>/dev/null || true)"
else
  echo "[nextcloud-startup] no database upgrade needed"
fi

if echo "$STATUS_JSON" | grep -q '"maintenance":true'; then
  echo "[nextcloud-startup] maintenance mode still enabled after startup checks" >&2
fi
