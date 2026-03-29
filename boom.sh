#!/bin/bash

# Project S "BOOM" Startup Script
# One-click to BUILD and START the entire ecosystem

# Load .env if it exists, create from example if not
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo "IMPORTANT: Edit .env to set your passwords before continuing!"
        echo "Press Enter to continue or Ctrl+C to edit first..."
        read
    fi
fi

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

# 4. Wait for Dashboard (with timeout)
echo "⏳ Waiting for dashboard to be ready..."
RETRIES=0
MAX_RETRIES=30
until $(curl --output /dev/null --silent --head --fail http://localhost:3069); do
    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
        echo -e "\nDashboard did not start in time. Check: docker compose logs dashboard"
        break
    fi
    printf '.'
    sleep 2
done

echo -e "\n✅ Project S is LIVE!"
echo "🔗 Access your dashboard at: http://localhost:3069"

# 5. Open in default browser (cross-platform)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3069
elif command -v open &> /dev/null; then
    open http://localhost:3069
else
    echo "Open http://localhost:3069 in your browser"
fi
