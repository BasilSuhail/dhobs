#!/bin/sh
# First-install hook: downloads and configures Nextcloud Office (richdocuments).
# Runs once, when Nextcloud initialises its database for the first time.
#
# Why app:install and not app:enable:
#   On a fresh clone, richdocuments has never been downloaded. app:enable on a
#   non-existent app is a silent no-op. app:install downloads it from the app store.
#
# WOPI URL routing (Collabora on Docker bridge network, NOT host network):
#   wopi_url        - Nextcloud container → Collabora via Docker service name
#   public_wopi_url - browser (on the host) → Collabora via localhost

php /var/www/html/occ app:install richdocuments || true

php /var/www/html/occ config:system:set allow_local_remote_servers \
    --value=true --type=boolean || true

php /var/www/html/occ config:app:set richdocuments wopi_url \
    --value="http://collabora:9980" || true

php /var/www/html/occ config:app:set richdocuments public_wopi_url \
    --value="http://localhost:9980" || true

# Allow Collabora to be framed by Nextcloud
php /var/www/html/occ config:system:set trusted_domains 3 \
    --value="collabora" || true

# CSP: allow Collabora frames from localhost:9980
php /var/www/html/occ config:system:set trusted_proxies 0 \
    --value="collabora" || true
