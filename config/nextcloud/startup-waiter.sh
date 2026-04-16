#!/bin/sh
set -eu

WAITER="${HOMEFORGE_WAITER:-/usr/local/bin/wait-for-db.sh}"
OCC="php /var/www/html/occ"

"$WAITER" tcp db 3306 90 "Nextcloud MariaDB"

STATUS_JSON="$($OCC status --output=json 2>/dev/null || true)"

if echo "$STATUS_JSON" | grep -q '"installed":true'; then
  echo "[nextcloud-startup] install detected"

  if echo "$STATUS_JSON" | grep -q '"needsDbUpgrade":true'; then
    echo "[nextcloud-startup] pending upgrade found"
    $OCC upgrade --no-interaction
    STATUS_JSON="$($OCC status --output=json 2>/dev/null || true)"
  else
    echo "[nextcloud-startup] no database upgrade needed"
  fi

  if echo "$STATUS_JSON" | grep -q '"maintenance":true'; then
    echo "[nextcloud-startup] maintenance mode still enabled after startup checks" >&2
  fi
else
  echo "[nextcloud-startup] fresh install or occ status unavailable; skipping upgrade"
fi
