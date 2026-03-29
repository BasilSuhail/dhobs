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
echo "You can view logs using: docker compose logs -f"
