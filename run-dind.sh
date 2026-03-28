#!/bin/bash

# Project S: HomeForge Docker-in-Docker Runner
# Optimized for Mac and Linux
# ---------------------------------------------

# Detect OS to handle sudo requirement (Mac usually doesn't need it)
DOCKER_CMD="docker"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if ! groups | grep -q "\bdocker\b"; then
        DOCKER_CMD="sudo docker"
    fi
fi

# 1. Initialize Matrix Element configuration
# This prevents Docker from creating a directory instead of a file during volume mounting
if [ ! -f ./config/matrix/element-config.json ]; then
    echo "Initializing Matrix Element configuration..."
    mkdir -p ./config/matrix
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

echo "Building the Docker-in-Docker HomeForge Image..."
$DOCKER_CMD build -t project-s-homeforge-dind -f Dockerfile.dind .

echo "Starting the HomeForge Environment..."
# Run the DinD container in privileged mode, exposing the necessary ports
# It will persist the internal /homeforge/data to a local ./dind-data directory on the host
$DOCKER_CMD run -d \
  --name homeforge-master \
  --privileged \
  -p 3069:3069 \
  -p 8096:8096 \
  -p 8081:8081 \
  -p 3030:3030 \
  -p 8008:8008 \
  -p 8082:8082 \
  -p 8083:8083 \
  -v "$(pwd)/dind-data:/homeforge/data" \
  project-s-homeforge-dind

echo "HomeForge Master Container started!"
echo "It may take a few minutes for the internal services (Jellyfin, Nextcloud, Dashboard) to build and start."
echo "You can view the startup logs with: $DOCKER_CMD logs -f homeforge-master"
