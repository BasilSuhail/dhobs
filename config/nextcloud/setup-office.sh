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

WAITER="${HOMEFORGE_WAITER:-/usr/local/bin/wait-for-db.sh}"
if "$WAITER" http http://collabora:9980/ 90 "Collabora"; then
    echo "Collabora is reachable. Configuring richdocuments..."
else
    echo "WARNING: Collabora not reachable after wait window. Configuring anyway."
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
# For local Docker access, we use localhost:9980.
php /var/www/html/occ config:app:set richdocuments public_wopi_url \
    --value="http://localhost:9980" || true

# Trust Collabora hostname in Nextcloud
php /var/www/html/occ config:system:set trusted_domains 3 \
    --value="collabora" || true

# Trust own Docker hostname (Collabora → Nextcloud WOPI callbacks)
php /var/www/html/occ config:system:set trusted_domains 5 \
    --value="nextcloud" || true
