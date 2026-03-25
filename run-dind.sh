#!/bin/bash

echo "Building the Docker-in-Docker HomeForge Image..."
sudo docker build -t project-s-homeforge-dind -f Dockerfile.dind .

echo "Starting the HomeForge Environment..."
# Run the DinD container in privileged mode, exposing the necessary ports
# It will persist the internal /homeforge/data to a local ./dind-data directory on the host
sudo docker run -d \
  --name homeforge-master \
  --privileged \
  -p 3000:3000 \
  -p 8096:8096 \
  -p 8081:8081 \
  -v "$(pwd)/dind-data:/homeforge/data" \
  project-s-homeforge-dind

echo "HomeForge Master Container started!"
echo "It may take a few minutes for the internal services (Jellyfin, Nextcloud, Dashboard) to build and start."
echo "You can view the startup logs with: sudo docker logs -f homeforge-master"
