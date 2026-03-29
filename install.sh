#!/bin/bash

# Project S: HomeForge Installation Script
# Supports Linux and macOS
# --------------------------------------------------

set -e

echo "Starting Project S HomeForge installation..."

# 0. Create .env from example if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo "IMPORTANT: Edit .env to set your passwords before continuing!"
        echo "Press Enter to continue or Ctrl+C to edit first..."
        read
    else
        echo "Warning: No .env or .env.example found. Continuing without environment file."
    fi
fi

# 1. Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# 2. Check for Docker Compose (plugin or standalone)
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install it: https://docs.docker.com/compose/install/"
    exit 1
fi

# 3. Check for python3 (used for cross-platform config file updates)
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is required but not installed."
    echo "Install it: https://www.python.org/ or use your package manager (apt install python3)"
    exit 1
fi

# 3. Create necessary data and config directories
echo "Creating data and configuration directories..."
mkdir -p ./data/jellyfin/config ./data/jellyfin/cache ./data/media
mkdir -p ./data/nextcloud/html ./data/nextcloud/data ./data/nextcloud/db
mkdir -p ./data/matrix/db ./data/matrix/synapse
mkdir -p ./data/vaultwarden
mkdir -p ./data/kiwix
mkdir -p ./data/workspace
mkdir -p ./config/matrix

# Ensure Nextcloud directories have correct permissions (UID 33 is www-data in the container)
# On macOS, Docker Desktop runs in a VM and handles file ownership automatically.
# On Linux, we need to set ownership to UID 33 (www-data) for the Nextcloud container.
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Setting permissions for Nextcloud..."
    if command -v sudo &> /dev/null; then
        sudo chown -R 33:33 ./data/nextcloud/html ./data/nextcloud/data 2>/dev/null || true
    else
        chown -R 33:33 ./data/nextcloud/html ./data/nextcloud/data 2>/dev/null || true
    fi
fi

# 4. Generate Synapse secrets and sync DB password
# Uses python3 for cross-platform file replacement (avoids sed -i differences between macOS/Linux)
replace_in_file() {
    local file="$1" old="$2" new="$3"
    python3 -c "
import sys
with open(sys.argv[1], 'r') as f:
    content = f.read()
content = content.replace(sys.argv[2], sys.argv[3])
with open(sys.argv[1], 'w') as f:
    f.write(content)
" "$file" "$old" "$new"
}

if grep -q "CHANGE_ME" ./config/matrix/homeserver.yaml 2>/dev/null; then
    echo "Generating random secrets for Matrix/Synapse..."
    REG_SECRET=$(openssl rand -hex 32)
    MAC_SECRET=$(openssl rand -hex 32)
    FORM_SECRET=$(openssl rand -hex 32)
    replace_in_file ./config/matrix/homeserver.yaml "homeforge_default_registration_secret_CHANGE_ME" "$REG_SECRET"
    replace_in_file ./config/matrix/homeserver.yaml "homeforge_default_macaroon_CHANGE_ME" "$MAC_SECRET"
    replace_in_file ./config/matrix/homeserver.yaml "homeforge_default_form_secret_CHANGE_ME" "$FORM_SECRET"
fi

# Sync Matrix DB password from .env to homeserver.yaml
if [ -f .env ]; then
    MATRIX_PW=$(grep MATRIX_DB_PASSWORD .env | cut -d'=' -f2)
    if [ -n "$MATRIX_PW" ] && grep -q "password: change_me_synapse_password" ./config/matrix/homeserver.yaml 2>/dev/null; then
        replace_in_file ./config/matrix/homeserver.yaml "change_me_synapse_password" "$MATRIX_PW"
    fi
fi

# 5. Initialize Matrix Element configuration
# Use HOMEFORGE_LAN_IP from .env if set, otherwise fall back to localhost
ELEMENT_HOST="localhost"
if [ -f .env ]; then
    LAN_IP=$(grep HOMEFORGE_LAN_IP .env | cut -d'=' -f2)
    if [ -n "$LAN_IP" ]; then
        ELEMENT_HOST="$LAN_IP"
    fi
fi
echo "Initializing Matrix Element configuration (homeserver: $ELEMENT_HOST)..."
cat <<EOF > ./config/matrix/element-config.json
{
    "default_server_config": {
        "m.homeserver": {
            "base_url": "http://$ELEMENT_HOST:8008",
            "server_name": "localhost"
        },
        "m.identity_server": {
            "base_url": "https://vector.im"
        }
    },
    "disable_custom_urls": false,
    "disable_guests": false,
    "disable_login_language_selector": false,
    "disable_3pid_login": false,
    "brand": "Element",
    "default_theme": "dark"
}
EOF

# 5. Ensure hook scripts are executable
# Git does not reliably preserve the executable bit on all platforms.
# Docker volume-mounts the scripts as-is from the host, and the Nextcloud
# entrypoint skips any hook that lacks the executable flag — silently.
chmod +x ./config/nextcloud/setup-office.sh
chmod +x ./config/nextcloud/setup-office-post-install.sh

# 6. Build and start the containers
echo "Building and starting containers in the background..."
docker compose up -d --build

echo "--------------------------------------------------"
echo "Installation complete! Your services are starting."
echo "--------------------------------------------------"
echo "Dashboard:      http://localhost:3069"
echo "Jellyfin:       http://localhost:8096"
echo "Nextcloud:      http://localhost:8081"
echo "Code Server:    http://localhost:3030"
echo "Matrix Element: http://localhost:8082"
echo "Vaultwarden:    http://localhost:8083"
echo "--------------------------------------------------"

# 6. Post-Installation Configuration
echo "Finalizing Nextcloud Hub configuration (this may take a moment)..."

# Wait for Nextcloud to be fully initialised before running occ commands.
# The post-installation and before-starting hooks inside the container handle
# richdocuments (Collabora Office) automatically. This loop simply waits until
# Nextcloud reports it is ready, then installs the remaining Hub apps.
echo "Waiting for Nextcloud to be ready..."
RETRIES=0
MAX_RETRIES=40
until docker exec -u www-data project-s-nextcloud php occ status 2>/dev/null | grep -q "installed: true"; do
    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
        echo "Timed out waiting for Nextcloud. Check logs: docker compose logs nextcloud"
        exit 1
    fi
    echo "  Not ready yet, retrying in 5 seconds... ($RETRIES/$MAX_RETRIES)"
    sleep 5
done
echo "Nextcloud is ready."

# Install the remaining Hub apps (Calendar, Contacts, Mail, Talk).
# richdocuments (Nextcloud Office / Collabora) is intentionally excluded here —
# it is installed and configured by the post-installation container hook.
echo "Installing Nextcloud Hub app suite..."
docker exec -u www-data project-s-nextcloud php occ app:install calendar || true
docker exec -u www-data project-s-nextcloud php occ app:install contacts || true
docker exec -u www-data project-s-nextcloud php occ app:install mail || true
docker exec -u www-data project-s-nextcloud php occ app:install spreed || true

# Drain the background job queue via CLI before the user opens the browser.
# Without this, Nextcloud runs all pending jobs through AJAX cron on first page
# load, blocking the browser for up to an hour on a fresh install with many apps.
# Running it here processes the full queue in the terminal — no browser required.
echo "Running Nextcloud background jobs (this may take several minutes)..."
docker exec -u www-data project-s-nextcloud php /var/www/html/cron.php
echo "Background jobs complete."

echo "Configuration complete! You can view logs using: docker compose logs -f"

# Open dashboard in default browser (cross-platform)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3069
elif command -v open &> /dev/null; then
    open http://localhost:3069
else
    echo "Open http://localhost:3069 in your browser"
fi
