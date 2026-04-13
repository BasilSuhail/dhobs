#!/bin/bash
# Project S "BOOM" Startup Script — Self-Healing Edition
# One-click to BUILD and START the entire ecosystem.
# This script repairs missing files/permissions before starting Docker.

set -e

# ──────────────────────────────────────────────
# 1. PREREQUISITE CHECKS
# ──────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker first."
    exit 1
fi
if ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed."
    exit 1
fi

echo "🚀 Launching Project S (Build & Run Mode)..."

# ──────────────────────────────────────────────
# 2. ENVIRONMENT SETUP
# ──────────────────────────────────────────────

# Create .env if missing
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📝 Creating .env from .env.example..."
        cp .env.example .env
        echo "✅ Created .env. (Edit it manually if you need custom passwords)"
    else
        echo "❌ Error: .env.example not found."
        exit 1
    fi
fi

# Auto-detect LAN IP
CURRENT_LAN_IP=$(grep "^HOMEFORGE_LAN_IP=" .env 2>/dev/null | cut -d'=' -f2-)
if [ -z "$CURRENT_LAN_IP" ] || [ "$CURRENT_LAN_IP" = "localhost" ]; then
    DETECTED_IP=""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        DETECTED_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
    else
        DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
    fi
    if [ -n "$DETECTED_IP" ]; then
        echo "🌍 Detected LAN IP: $DETECTED_IP"
        # Cross-platform safe IP update using awk (works on both Mac & Linux)
        if grep -q "^HOMEFORGE_LAN_IP=" .env; then
            awk -v ip="$DETECTED_IP" '/^HOMEFORGE_LAN_IP=/ { sub(/=.*/, "="ip); print; next } { print }' .env > .env.tmp && mv .env.tmp .env
        else
            echo "HOMEFORGE_LAN_IP=$DETECTED_IP" >> .env
        fi
    fi
fi

# Sync Matrix secrets into homeserver.yaml template
LAN_IP=$(grep "^HOMEFORGE_LAN_IP=" .env 2>/dev/null | cut -d'=' -f2- || echo "localhost")
REG_SECRET=$(grep "^MATRIX_REGISTRATION_SECRET=" .env 2>/dev/null | cut -d'=' -f2-)
MAC_SECRET=$(grep "^MATRIX_MACAROON_SECRET_KEY=" .env 2>/dev/null | cut -d'=' -f2-)
FORM_SECRET=$(grep "^MATRIX_FORM_SECRET=" .env 2>/dev/null | cut -d'=' -f2-)
DB_PASS=$(cat ./data/secrets/mysql_password 2>/dev/null || echo "dummy")

cat <<EOF > ./config/matrix/homeserver.yaml.tpl
server_name: "localhost"
pid_file: /data/homeserver.pid
listeners:
  - port: 8008
    tls: false
    type: http
    x_forwarded: true
    resources:
      - names: [client, federation]
        compress: false
database:
  name: psycopg2
  args:
    user: synapse
    password: "${DB_PASS:-change_me_generate_with_openssl_rand_hex_32}"
    database: synapse
    host: synapse-db
    cp_min: 5
    cp_max: 10
log_config: "/data/localhost.log.config"
media_store_path: /data/media_store
registration_shared_secret: "$REG_SECRET"
macaroon_secret_key: "$MAC_SECRET"
form_secret: "$FORM_SECRET"
report_stats: false
EOF

# Generate Element config
cat <<EOF > ./config/matrix/element-config.json
{
    "default_server_config": {
        "m.homeserver": {
            "base_url": "http://localhost:8008",
            "server_name": "localhost"
        }
    },
    "default_theme": "dark"
}
EOF

# ──────────────────────────────────────────────
# 3. SELF-HEALING CONFIGURATION
# ──────────────────────────────────────────────
echo "🔧 Verifying configuration..."

# Fix: Ensure Collabora config is a file
mkdir -p ./config/collabora
if [ ! -f ./config/collabora/coolwsd-override.xml ]; then
    cat > ./config/collabora/coolwsd-override.xml << 'XMLEOF'
<config>
    <storage>
        <wopi>
            <host desc="localhost" allow="true">localhost</host>
            <host desc="host.docker.internal" allow="true">host.docker.internal</host>
        </wopi>
    </storage>
</config>
XMLEOF
    echo "   ✅ Created Collabora config"
fi

# Fix: Ensure Matrix log is a file
if [ -d ./data/matrix/synapse/homeserver.log ]; then
    rm -rf ./data/matrix/synapse/homeserver.log
fi
touch ./data/matrix/synapse/homeserver.log
chmod 666 ./data/matrix/synapse/homeserver.log

# Fix: Ensure Filebrowser DB is a file
if [ -d ./data/filebrowser/database.db ]; then
    rm -rf ./data/filebrowser/database.db
fi
mkdir -p ./data/filebrowser
touch ./data/filebrowser/database.db

# Fix: Ensure Secrets exist (Self-Healing)
if [ ! -f ./data/secrets/mysql_root_password ]; then
    mkdir -p ./data/secrets
    echo "🔐 Initializing Docker Secrets..."

    # List of all required secrets
    SECRETS=(mysql_root_password mysql_password nextcloud_admin_password collabora_password matrix_registration_secret matrix_macaroon_secret_key matrix_form_secret webui_secret_key vpn_admin_password)

    for secret in "${SECRETS[@]}"; do
        if [ ! -f "./data/secrets/$secret" ]; then
            openssl rand -hex 32 > "./data/secrets/$secret"
            echo "   ✅ Generated random secret: $secret"
        fi
    done

    # Tailscale auth key is optional (user-provided)
    if [ ! -f ./data/secrets/tailscale_authkey ]; then
        touch ./data/secrets/tailscale_authkey
        echo "   ℹ️  Tailscale auth key not set (empty file). Remote access disabled until configured."
    fi
fi

# Fix: Ensure Security directory permissions
mkdir -p ./data/security
chmod 700 ./data/security

# ──────────────────────────────────────────────
# 4. PORT CONFLICT CHECK
# ──────────────────────────────────────────────
if command -v lsof &> /dev/null; then
    if lsof -iTCP:3069 -sTCP:LISTEN -P -n &>/dev/null 2>&1; then
        echo "⚠️  Port 3069 is already in use."
        echo "   Is another instance of Project S running?"
        exit 1
    fi
    if lsof -iTCP:443 -sTCP:LISTEN -P -n &>/dev/null 2>&1; then
        echo "⚠️  Port 443 is already in use."
        echo "   Traefik needs port 443 for HTTPS."
        exit 1
    fi
fi

# ──────────────────────────────────────────────
# 5. START SERVICES
# ──────────────────────────────────────────────
echo "📦 Building and Starting Docker containers..."
# Down first to clear out orphans
docker compose down --remove-orphans > /dev/null 2>&1 || true
docker compose up -d --build

# ──────────────────────────────────────────────
# 6. POST-START CONFIGURATION
# ──────────────────────────────────────────────

# Inject ollama alias into Theia
echo "🤖 Configuring ollama alias in Theia..."
docker exec project-s-theia bash -c \
  "grep -q 'alias ollama' /root/.bashrc 2>/dev/null || echo \"alias ollama='docker exec -it project-s-ollama ollama'\" >> /root/.bashrc" \
  2>/dev/null || true

# Auto-build Ollama Modelfiles
if ls ./config/ollama/*.Modelfile 1>/dev/null 2>&1; then
    echo "🧠 Building Ollama Modelfiles..."
    sleep 5 # Give Ollama time to start
    for mf in ./config/ollama/*.Modelfile; do
        model_name=$(basename "$mf" .Modelfile)
        docker exec project-s-ollama ollama create "$model_name" -f "/modelfiles/$(basename "$mf")" 2>/dev/null \
            && echo "   ✅ $model_name built" \
            || echo "   ⚠️  Failed to build $model_name"
    done
fi

# Wait for Dashboard
echo "⏳ Waiting for dashboard..."
RETRIES=0
until $(curl --output /dev/null --silent --head --fail http://localhost:3069) || [ $RETRIES -ge 30 ]; do
    printf '.'
    sleep 2
    RETRIES=$((RETRIES + 1))
done

echo ""
echo "✅ Project S is LIVE!"
echo "🔗 Access your dashboard at: http://localhost:3069"

# First-time setup prompt
if [ ! -f ./data/security/.homeforge.key ]; then
    echo ""
    echo "┌─────────────────────────────────────────────────────┐"
    echo "│  FIRST-TIME DASHBOARD SETUP REQUIRED                │"
    echo "│  1. Open http://localhost:3069                      │"
    echo "│  2. Generate entropy key & create admin account     │"
    echo "└─────────────────────────────────────────────────────┘"
fi

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3069
elif command -v open &> /dev/null; then
    open http://localhost:3069
fi

# Tailscale status
if docker compose ps tailscale 2>/dev/null | grep -q "Up"; then
    echo "🌐 Checking Tailscale..."
    sleep 3
    TS_STATUS=$(docker exec project-s-tailscale tailscale status --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Self',{}).get('TailscaleIPs',['Not connected'])[0])" 2>/dev/null || echo "Not connected")
    if [ "$TS_STATUS" != "Not connected" ] && [ -n "$TS_STATUS" ]; then
        echo "   ✅ Tailscale connected: $TS_STATUS"
    else
        echo "   ⚠️  Tailscale not connected. Run: ./scripts/setup-tailscale.sh"
    fi
fi