#!/bin/sh
# Every-start hook: ensures Nextcloud Office (richdocuments) is enabled and correctly
# configured. Runs before Apache starts on every container start.
#
# app:install is NOT run here — that is the post-installation hook's job.
# By the time this hook runs on any restart, the app is already installed.
#
# These config:app:set calls are idempotent — safe to re-apply on every boot.
# They ensure WOPI URLs are never left in a broken state after a manual occ command.
#
# WOPI URL routing:
#   wopi_url        - Nextcloud container → Collabora via Docker service name
#   public_wopi_url - browser (on the host) → Collabora via localhost

# Wait for Collabora to be reachable before configuring richdocuments.
# Without this, the WOPI discovery URL fails and token generation returns 500.
echo "Waiting for Collabora to be reachable..."
RETRIES=0
MAX_RETRIES=30
while ! curl -sf http://collabora:9980/ > /dev/null 2>&1; do
    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
        echo "WARNING: Collabora not reachable after ${MAX_RETRIES} attempts. Configuring anyway (settings are stored, will work once Collabora starts)."
        break
    fi
    sleep 2
done
if [ "$RETRIES" -lt "$MAX_RETRIES" ]; then
    echo "Collabora is reachable. Configuring richdocuments..."
fi

php /var/www/html/occ app:enable richdocuments || true

php /var/www/html/occ config:system:set allow_local_remote_servers \
    --value=true --type=boolean || true

php /var/www/html/occ config:app:set richdocuments wopi_url \
    --value="http://collabora:9980" || true

# public_wopi_url: the URL the BROWSER uses to reach Collabora.
# Uses HOMEFORGE_LAN_IP env var if set (passed from docker-compose), else localhost.
PUBLIC_HOST="${HOMEFORGE_LAN_IP:-localhost}"
php /var/www/html/occ config:app:set richdocuments public_wopi_url \
    --value="http://${PUBLIC_HOST}:9980" || true

# Allow Collabora to be framed by Nextcloud
php /var/www/html/occ config:system:set trusted_domains 3 \
    --value="collabora" || true
