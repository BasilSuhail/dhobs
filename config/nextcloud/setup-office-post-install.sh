#!/bin/sh
# First-install hook: downloads and configures Nextcloud Office (richdocuments).
# Runs once, when Nextcloud initialises its database for the first time.

php /var/www/html/occ app:install richdocuments || true

php /var/www/html/occ config:system:set allow_local_remote_servers \
    --value=true --type=boolean || true

# wopi_url: Nextcloud → Collabora (Docker-internal)
php /var/www/html/occ config:app:set richdocuments wopi_url \
    --value="http://collabora:9980" || true

# wopi_callback_url: Collabora → Nextcloud (Docker-internal)
# Overrides the browser-derived WOPISrc so Collabora uses Docker DNS
# to reach Nextcloud instead of trying unreachable "localhost:8081"
php /var/www/html/occ config:app:set richdocuments wopi_callback_url \
    --value="http://nextcloud:80" || true

# public_wopi_url: Browser → Collabora
PUBLIC_HOST="${HOMEFORGE_LAN_IP:-localhost}"
php /var/www/html/occ config:app:set richdocuments public_wopi_url \
    --value="http://${PUBLIC_HOST}:9980" || true

# Trust Collabora hostname
php /var/www/html/occ config:system:set trusted_domains 3 \
    --value="collabora" || true
