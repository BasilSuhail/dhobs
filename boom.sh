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
mkdir -p ./data/filebrowser
# Docker can create database.db as a directory if the file didn't exist at mount time.
# Remove it if so, then create it as a proper empty file.
[ -d ./data/filebrowser/database.db ] && rm -rf ./data/filebrowser/database.db
touch ./data/filebrowser/database.db
mkdir -p ./data/vpn/{pki,clients,config,staticclients,log,db}
# Copy VPN seed configs only on first run — never overwrite a live PKI
if [ ! -f ./data/vpn/server.conf ]; then
    cp -r ./config/vpn/. ./data/vpn/
    echo "VPN seed configs copied to ./data/vpn/"
fi
# Security directory for entropy key, encrypted key file, and user database
# Must exist on the host before the container starts so Docker mounts it correctly
mkdir -p ./data/security
chmod 700 ./data/security
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

# Inject ollama alias into Theia so 'ollama' works natively in the dashboard terminal
echo "🤖 Configuring ollama alias in Theia..."
docker exec project-s-theia bash -c \
  "grep -q 'alias ollama' /root/.bashrc 2>/dev/null || echo \"alias ollama='docker exec -it project-s-ollama ollama'\" >> /root/.bashrc" \
  2>/dev/null || echo "   ⚠️  Theia not ready yet — alias will be added on next boom.sh run."

# Auto-build Ollama Modelfiles from config/ollama/
if ls ./config/ollama/*.Modelfile 1>/dev/null 2>&1; then
    echo "🧠 Building Ollama Modelfiles..."
    # Wait briefly for Ollama to be ready
    OLLAMA_RETRIES=0
    until docker exec project-s-ollama ollama list &>/dev/null || [ "$OLLAMA_RETRIES" -ge 15 ]; do
        OLLAMA_RETRIES=$((OLLAMA_RETRIES + 1))
        printf '.'
        sleep 2
    done
    echo ""
    for mf in ./config/ollama/*.Modelfile; do
        model_name=$(basename "$mf" .Modelfile)
        echo "   Building: $model_name"
        docker exec project-s-ollama ollama create "$model_name" -f "/modelfiles/$(basename "$mf")" \
            && echo "   ✅ $model_name built" \
            || echo "   ⚠️  Failed to build $model_name — base model may not be pulled yet. Run: docker exec project-s-ollama ollama create $model_name -f /modelfiles/$(basename "$mf")"
    done
else
    echo "ℹ️  No Modelfiles found in config/ollama/ — skipping."
fi

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

# Check if the dashboard has been set up before — key file presence means setup is done
if [ ! -f ./data/security/.homeforge.key ]; then
    echo ""
    echo "┌─────────────────────────────────────────────────────┐"
    echo "│  FIRST-TIME DASHBOARD SETUP REQUIRED                │"
    echo "│                                                     │"
    echo "│  1. Open http://localhost:3069                      │"
    echo "│     You will be redirected to /setup automatically  │"
    echo "│                                                     │"
    echo "│  2. Move your mouse over the canvas to generate     │"
    echo "│     your 128-character encryption key               │"
    echo "│                                                     │"
    echo "│  3. Copy and store the key somewhere safe —         │"
    echo "│     you will need it if you ever need to recover    │"
    echo "│                                                     │"
    echo "│  4. Create your admin account to finish setup       │"
    echo "└─────────────────────────────────────────────────────┘"
    echo ""
fi

# 5. Open in default browser (cross-platform)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3069
elif command -v open &> /dev/null; then
    open http://localhost:3069
else
    echo "Open http://localhost:3069 in your browser"
fi
