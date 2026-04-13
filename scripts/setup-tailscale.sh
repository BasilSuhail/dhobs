#!/bin/bash
# Setup Tailscale — connects to your Tailscale network.
# Usage: ./scripts/setup-tailscale.sh <TS_AUTHKEY>
# Get your key from: https://login.tailscale.com/admin/settings/keys

set -e

AUTHKEY="$1"

if [ -z "$AUTHKEY" ]; then
    echo "❌ Usage: $0 <TS_AUTHKEY>"
    echo ""
    echo "Get your auth key from: https://login.tailscale.com/admin/settings/keys"
    echo "Create a reusable auth key with --reusable flag in Tailscale admin."
    exit 1
fi

echo "🔐 Storing Tailscale auth key..."
mkdir -p ./data/secrets
echo -n "$AUTHKEY" > ./data/secrets/tailscale_authkey
chmod 600 ./data/secrets/tailscale_authkey
echo "   ✅ Auth key saved."

echo "🔄 Restarting Tailscale container..."
docker compose up -d tailscale

echo "⏳ Waiting for Tailscale to connect..."
RETRIES=0
while [ $RETRIES -lt 30 ]; do
    sleep 2
    STATUS=$(docker exec project-s-tailscale tailscale status --json 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ips = d.get('Self', {}).get('TailscaleIPs', [])
    if ips:
        print(f\"Connected: {ips[0]}\")
    else:
        print('Connecting...')
except:
    print('Not ready')
" 2>/dev/null || echo "Not ready")
    
    echo "   $STATUS"
    if echo "$STATUS" | grep -q "Connected"; then
        break
    fi
    RETRIES=$((RETRIES + 1))
done

echo ""
if echo "$STATUS" | grep -q "Connected"; then
    echo "✅ Tailscale is connected!"
    echo "🌐 Your services are now accessible via Tailscale MagicDNS"
    echo "   Dashboard: http://homeforge:3069"
    echo "   Nextcloud: http://nextcloud:8081"
    echo "   Jellyfin:  http://jellyfin:8096"
    echo ""
    echo "   (Access these from any device on your Tailscale network)"
else
    echo "⚠️  Tailscale did not connect within 60 seconds."
    echo "   Check logs: docker compose logs tailscale"
    echo "   Or re-run with a fresh auth key."
fi
