#!/bin/bash

# Project S "BOOM" Startup Script
# One-click to BUILD and START the entire ecosystem

echo "🚀 Launching Project S (Build & Run Mode)..."

# 1. Clean up old containers
echo "🧹 Cleaning up environment..."
docker compose down --remove-orphans > /dev/null 2>&1

# 2. Fix Matrix logging permissions
echo "🔒 Ensuring file permissions..."
touch data/matrix/synapse/homeserver.log > /dev/null 2>&1
chmod 666 data/matrix/synapse/homeserver.log > /dev/null 2>&1

# 3. Build and Start services
echo "📦 Building and Starting Docker containers..."
docker compose up -d --build

# 4. Wait for Dashboard
echo "⏳ Waiting for dashboard to be ready..."
until $(curl --output /dev/null --silent --head --fail http://localhost:3069); do
    printf '.'
    sleep 2
done

echo -e "\n✅ Project S is LIVE!"
echo "🔗 Access your dashboard at: http://localhost:3069"

# 5. Open in browser
open http://localhost:3069
