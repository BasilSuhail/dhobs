#!/bin/sh
# Configures Nextcloud Office (richdocuments) to use the external Collabora container.
#
# Why two URLs:
#   wopi_url        - used server-side (inside the Nextcloud container) to reach Collabora
#   public_wopi_url - used by the browser (on the host) to reach Collabora
#
# Without this, Nextcloud defaults to localhost:8081 (the host-mapped port), which
# does not exist inside the container, causing the editor to load infinitely.

php /var/www/html/occ config:app:set richdocuments wopi_url \
    --value="http://host.docker.internal:9980" || true

php /var/www/html/occ config:app:set richdocuments public_wopi_url \
    --value="http://localhost:9980" || true
