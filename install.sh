#!/bin/bash

# Project S: HomeForge Installation Script for Linux
# --------------------------------------------------

set -e

echo "Starting Project S HomeForge installation..."

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

# 3. Create necessary data and config directories
echo "Creating data and configuration directories..."
mkdir -p ./data/jellyfin/config ./data/jellyfin/cache ./data/media
mkdir -p ./data/nextcloud/html ./data/nextcloud/data ./data/nextcloud/db
mkdir -p ./data/matrix/db ./data/matrix/synapse
mkdir -p ./data/vaultwarden
mkdir -p ./config/matrix

# Ensure Nextcloud directories have correct permissions (UID 33 is www-data in the container)
echo "Setting permissions for Nextcloud..."
sudo chown -R 33:33 ./data/nextcloud/html ./data/nextcloud/data

# 4. Initialize Matrix Element configuration
# This prevents Docker from creating a directory instead of a file during volume mounting
if [ ! -f ./config/matrix/element-config.json ]; then
    echo "Initializing Matrix Element configuration..."
    cat <<EOF > ./config/matrix/element-config.json
{
    "default_server_config": {
        "m.homeserver": {
            "base_url": "http://localhost:8008",
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
fi

# 5. Build and start the containers
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

echo "Configuration complete! You can view logs using: docker compose logs -f"
