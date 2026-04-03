#!/bin/sh
# Every-start hook: ensures Nextcloud Office (richdocuments) is enabled and correctly
# configured. Runs before Apache starts on every container start.
#
# WOPI URL routing (3 URLs, each serves a different purpose):
#   wopi_url          - Nextcloud → Collabora (how NC reaches Collabora for discovery)
#   wopi_callback_url - Collabora → Nextcloud (how Collabora fetches/saves files)
#   public_wopi_url   - Browser → Collabora (the editor iframe URL)
#
# The critical insight: Collabora does NOT rewrite WOPISrc callback URLs.
# When the browser sends WOPISrc=http://localhost:8081/..., Collabora tries
# to HTTP GET that URL as-is. Inside the container, "localhost" is itself.
# wopi_callback_url overrides this — telling richdocuments to use the
# Docker-internal hostname (http://nextcloud:80) for all WOPI callbacks.

# Wait for Collabora to be reachable before configuring richdocuments.
echo "Waiting for Collabora to be reachable..."
RETRIES=0
MAX_RETRIES=30
while ! curl -sf http://collabora:9980/ > /dev/null 2>&1; do
    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
        echo "WARNING: Collabora not reachable after ${MAX_RETRIES} attempts. Configuring anyway."
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

# wopi_url: Nextcloud → Collabora (Docker-internal, for WOPI discovery XML)
php /var/www/html/occ config:app:set richdocuments wopi_url \
    --value="http://collabora:9980" || true

# wopi_callback_url: THE KEY SETTING for Docker bridge networks.
# Tells richdocuments to override the browser-derived WOPISrc hostname
# with this Docker-internal URL for all Collabora→Nextcloud callbacks
# (CheckFileInfo, GetFile, PutFile). Without this, Collabora tries to
# reach http://localhost:8081 which is unreachable from inside its container.
# Requires richdocuments v8.0+ (PR #3315, Dec 2023).
php /var/www/html/occ config:app:set richdocuments wopi_callback_url \
    --value="http://nextcloud:80" || true

# public_wopi_url: Browser → Collabora (the editor iframe URL)
# IMPORTANT: this value is baked into Nextcloud's Content Security Policy on
# every page load. If it is 'localhost', the browser will block Collabora from
# loading on any device that is not the server itself.
PUBLIC_HOST="${HOMEFORGE_LAN_IP:-localhost}"
if [ "$PUBLIC_HOST" = "localhost" ]; then
    echo "WARNING: HOMEFORGE_LAN_IP is not set or is 'localhost'."
    echo "  Nextcloud Office will only work on the server machine itself."
    echo "  To fix: set HOMEFORGE_LAN_IP to your LAN IP in .env and recreate containers."
fi
php /var/www/html/occ config:app:set richdocuments public_wopi_url \
    --value="http://${PUBLIC_HOST}:9980" || true

# Trust Collabora hostname in Nextcloud
php /var/www/html/occ config:system:set trusted_domains 3 \
    --value="collabora" || true
