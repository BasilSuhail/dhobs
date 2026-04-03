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

# Auto-detect LAN IP if not set or set to placeholder 'localhost' in .env
CURRENT_LAN_IP=$(grep "^HOMEFORGE_LAN_IP=" .env 2>/dev/null | cut -d'=' -f2-)
if [ -f .env ] && { [ -z "$CURRENT_LAN_IP" ] || [ "$CURRENT_LAN_IP" = "localhost" ]; }; then
    DETECTED_IP=""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        DETECTED_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
    else
        DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
    fi
    if [ -n "$DETECTED_IP" ]; then
        echo "Detected LAN IP: $DETECTED_IP"
        python3 -c "
import sys, re
with open('.env', 'r') as f: content = f.read()
content = re.sub(r'^HOMEFORGE_LAN_IP=.*', 'HOMEFORGE_LAN_IP=' + sys.argv[1], content, flags=re.MULTILINE)
with open('.env', 'w') as f: f.write(content)
" "$DETECTED_IP"
        echo "Set HOMEFORGE_LAN_IP=$DETECTED_IP in .env"
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
mkdir -p ./data/filebrowser
# Docker can create database.db as a directory if the file didn't exist at mount time.
# Remove it if so, then create it as a proper empty file.
[ -d ./data/filebrowser/database.db ] && rm -rf ./data/filebrowser/database.db
touch ./data/filebrowser/database.db
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
    MATRIX_PW=$(grep MATRIX_DB_PASSWORD .env | cut -d'=' -f2-)
    if [ -n "$MATRIX_PW" ] && grep -q "password: change_me_synapse_password" ./config/matrix/homeserver.yaml 2>/dev/null; then
        replace_in_file ./config/matrix/homeserver.yaml "change_me_synapse_password" "$MATRIX_PW"
    fi
fi

# 5. Initialize Matrix Element configuration
# Use HOMEFORGE_LAN_IP from .env if set, otherwise fall back to localhost
ELEMENT_HOST="localhost"
if [ -f .env ]; then
    LAN_IP=$(grep HOMEFORGE_LAN_IP .env | cut -d'=' -f2-)
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

# Verify HOMEFORGE_LAN_IP is set before starting — Collabora's server_name
# depends on it and will mismatch if empty, causing "Document loading failed".
FINAL_LAN_IP=$(grep "^HOMEFORGE_LAN_IP=" .env 2>/dev/null | cut -d'=' -f2-)
if [ -z "$FINAL_LAN_IP" ]; then
    echo "Error: HOMEFORGE_LAN_IP could not be detected and is not set in .env"
    echo "Please set it manually: echo 'HOMEFORGE_LAN_IP=<your-machine-ip>' >> .env"
    exit 1
fi

# 6. Build and start the containers
echo "Building and starting containers in the background..."
if ! docker compose up -d --build; then
    echo ""
    echo "ERROR: Docker Compose failed to start. Common causes:"
    echo "  - Image pull failure (check your internet connection)"
    echo "  - Port conflict (another service on ports 3069, 8081, 8096, 9980, etc.)"
    echo "  - Insufficient disk space"
    echo ""
    echo "Run 'docker compose logs' for details."
    exit 1
fi

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

# Verify critical containers are running (checked here because all should be up by now)
echo "Verifying container health..."
FAILED=0
for svc in project-s-nextcloud project-s-collabora project-s-nextcloud-db project-s-jellyfin project-s-dashboard; do
    if docker ps --format '{{.Names}}' | grep -q "$svc"; then
        echo "  OK: $svc"
    else
        echo "  WARNING: $svc is not running"
        FAILED=$((FAILED + 1))
    fi
done
if [ "$FAILED" -gt 0 ]; then
    echo "WARNING: $FAILED container(s) not running. Check: docker compose logs"
fi

# Install the remaining Hub apps (Calendar, Contacts, Mail, Talk).
# richdocuments (Nextcloud Office / Collabora) is intentionally excluded here —
# it is installed and configured by the post-installation container hook.
echo "Installing Nextcloud Hub app suite..."
docker exec -u www-data project-s-nextcloud php occ app:install calendar || true
docker exec -u www-data project-s-nextcloud php occ app:install contacts || true
docker exec -u www-data project-s-nextcloud php occ app:install mail || true
docker exec -u www-data project-s-nextcloud php occ app:install spreed || true

# Force-configure richdocuments (Collabora Office) from the host side.
# The container hooks (setup-office.sh) run at container start, but if Collabora
# wasn't reachable at that point, or if stale config persists from a prior install,
# this ensures the WOPI URLs are correct NOW.
echo "Configuring Nextcloud Office (Collabora)..."
docker exec -u www-data project-s-nextcloud php occ app:install richdocuments || true
docker exec -u www-data project-s-nextcloud php occ app:enable richdocuments || true
docker exec -u www-data project-s-nextcloud php occ config:system:set allow_local_remote_servers --value=true --type=boolean || true
docker exec -u www-data project-s-nextcloud php occ config:app:set richdocuments wopi_url --value="http://collabora:9980" || true
# wopi_callback_url: THE KEY SETTING. Tells richdocuments to use Docker-internal
# hostname for Collabora→Nextcloud callbacks instead of browser-derived localhost.
docker exec -u www-data project-s-nextcloud php occ config:app:set richdocuments wopi_callback_url --value="http://nextcloud:80" || true
INSTALL_HOST="${HOMEFORGE_LAN_IP:-localhost}"
if [ -f .env ]; then
    ENV_LAN_IP=$(grep "^HOMEFORGE_LAN_IP=" .env | cut -d'=' -f2-)
    [ -n "$ENV_LAN_IP" ] && INSTALL_HOST="$ENV_LAN_IP"
fi
docker exec -u www-data project-s-nextcloud php occ config:app:set richdocuments public_wopi_url --value="http://${INSTALL_HOST}:9980" || true
echo "Nextcloud Office configured:"
echo "  wopi_url=http://collabora:9980 (NC→Collabora)"
echo "  wopi_callback_url=http://nextcloud:80 (Collabora→NC)"
echo "  public_wopi_url=http://${INSTALL_HOST}:9980 (Browser→Collabora)"

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
