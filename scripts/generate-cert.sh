#!/bin/bash
# Generate a self-signed SSL certificate for HomeForge's LAN IP.
# Usage: bash scripts/generate-cert.sh <LAN_IP>
# Example: bash scripts/generate-cert.sh 192.168.1.100

set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")/../config/nginx/ssl" && pwd)"
LAN_IP="${1:-}"

if [ -z "$LAN_IP" ]; then
    # Auto-detect LAN IP
    if command -v ipconfig &>/dev/null; then
        LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
    fi
    if [ -z "$LAN_IP" ]; then
        echo "❌ Could not auto-detect LAN IP."
        echo "Usage: bash $0 <LAN_IP>"
        exit 1
    fi
fi

echo "🔐 Generating self-signed SSL certificate for: $LAN_IP"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/C=US/ST=HomeForge/L=HomeForge/O=HomeForge/CN=$LAN_IP" \
    -addext "subjectAltName=IP:$LAN_IP,IP:127.0.0.1,DNS:localhost" 2>/dev/null

echo "✅ Certificate generated:"
echo "   Full chain: $CERT_DIR/fullchain.pem"
echo "   Private key: $CERT_DIR/privkey.pem"
echo ""
echo "⚠️  Your browser will show a 'Not Secure' warning for this certificate."
echo "    This is expected for self-signed LAN certificates."
echo "    Click 'Advanced → Proceed' to access the dashboard."
echo ""
echo "💡 To replace with Let's Encrypt later, see comments in config/nginx/nginx.conf"
