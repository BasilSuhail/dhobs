#!/bin/sh
# First-install hook: downloads and configures Nextcloud Office (richdocuments).
# Runs once, when Nextcloud initialises its database for the first time.
#
# Why app:install and not app:enable:
#   On a fresh clone, richdocuments has never been downloaded. app:enable on a
#   non-existent app is a silent no-op. app:install downloads it from the app store.
#
# Why two WOPI URLs:
#   wopi_url        - Nextcloud container (server-side) → Collabora via host gateway
#   public_wopi_url - browser (on the host) → Collabora via localhost
#
# Why nextcloud_url is NOT set:
#   Collabora runs with network_mode: host. It reaches Nextcloud at localhost:8081.
#   Nextcloud's own OVERWRITEHOST already reflects this. Setting nextcloud_url to
#   the Docker service name "nextcloud" would make it unresolvable from host network.

php /var/www/html/occ app:install richdocuments || true

php /var/www/html/occ config:system:set allow_local_remote_servers \
    --value=true --type=boolean || true

php /var/www/html/occ config:app:set richdocuments wopi_url \
    --value="http://host.docker.internal:9980" || true

php /var/www/html/occ config:app:set richdocuments public_wopi_url \
    --value="http://localhost:9980" || true
