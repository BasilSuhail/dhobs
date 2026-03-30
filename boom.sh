#!/bin/bash
set -e

# Project S "BOOM" Startup Script
# One-click to BUILD and START the entire ecosystem

# Check for required tools
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is required but not installed."
    exit 1
fi

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

# Auto-detect LAN IP if not set in .env
if [ -f .env ] && ! grep -q "^HOMEFORGE_LAN_IP=." .env; then
    DETECTED_IP=""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        DETECTED_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
    else
        DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
    fi
    if [ -n "$DETECTED_IP" ]; then
        echo "Detected LAN IP: $DETECTED_IP"
        python3 -c "
import sys
with open('.env', 'r') as f: content = f.read()
content = content.replace('HOMEFORGE_LAN_IP=', 'HOMEFORGE_LAN_IP=' + sys.argv[1], 1)
with open('.env', 'w') as f: f.write(content)
" "$DETECTED_IP"
    fi
fi

# Regenerate Element config with correct hostname
ELEMENT_HOST="localhost"
if [ -f .env ]; then
    LAN_IP=$(grep "^HOMEFORGE_LAN_IP=" .env | cut -d'=' -f2-)
    [ -n "$LAN_IP" ] && ELEMENT_HOST="$LAN_IP"
fi
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

echo "🚀 Launching Project S (Build & Run Mode)..."

# Ensure data directories exist (install.sh creates these, but boom.sh should too)
mkdir -p ./data/jellyfin/config ./data/jellyfin/cache ./data/media
mkdir -p ./data/nextcloud/html ./data/nextcloud/data ./data/nextcloud/db
mkdir -p ./data/matrix/db ./data/matrix/synapse
mkdir -p ./data/vaultwarden ./data/kiwix ./data/workspace
mkdir -p ./data/ollama ./data/open-webui
mkdir -p ./config/matrix

# Check for native Ollama process holding port 11434 (common on macOS)
if lsof -i :11434 -sTCP:LISTEN &>/dev/null 2>&1; then
    echo "⚠️  Port 11434 is already in use (native Ollama running)."
    echo "   The Docker Ollama container will fail to bind this port."
    echo -n "   Stop native Ollama now and continue? [y/N] "
    read -r KILL_OLLAMA
    if [[ "$KILL_OLLAMA" =~ ^[Yy]$ ]]; then
        pkill -x ollama 2>/dev/null && echo "   ✅ Native Ollama stopped." || echo "   ⚠️  Could not stop Ollama — kill it manually and re-run."
        sleep 1
    else
        echo "   Skipping — Ollama container may not start correctly."
    fi
fi

# Sync Synapse secrets and DB password
# Uses python3 for cross-platform file replacement (avoids sed -i differences)
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
if [ -f .env ]; then
    MATRIX_PW=$(grep MATRIX_DB_PASSWORD .env | cut -d'=' -f2-)
    if [ -n "$MATRIX_PW" ] && grep -q "password: change_me_synapse_password" ./config/matrix/homeserver.yaml 2>/dev/null; then
        replace_in_file ./config/matrix/homeserver.yaml "change_me_synapse_password" "$MATRIX_PW"
    fi
fi

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
