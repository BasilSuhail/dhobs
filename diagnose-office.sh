#!/bin/bash
# Project S: Nextcloud Office (Collabora) Diagnostic Tool
# Run this if document editing shows "Unauthorized WOPI host" or infinite loading

echo "========================================"
echo "  Nextcloud Office Diagnostic Tool"
echo "========================================"
echo ""

# Pre-flight: check curl is available
if ! command -v curl &> /dev/null; then
    echo "Error: curl is required but not installed."
    exit 1
fi

# 1. Check Collabora is running
echo "1. Collabora container status:"
if docker ps --format '{{.Names}} {{.Status}}' | grep -q "project-s-collabora"; then
    docker ps --format '   {{.Names}}: {{.Status}}' | grep "project-s-collabora"
else
    echo "   FAIL: project-s-collabora is NOT running"
    echo "   Fix: docker compose up -d collabora"
    exit 1
fi

# 2. Check Collabora is reachable
echo ""
echo "2. Collabora HTTP check:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:9980/ 2>/dev/null)
if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 400 ]; then
    echo "   OK: localhost:9980 responds ($STATUS)"
else
    echo "   FAIL: localhost:9980 not reachable (status: $STATUS)"
    echo "   Fix: docker compose logs collabora"
    exit 1
fi

# 3. Check Collabora WOPI discovery endpoint
echo ""
echo "3. WOPI Discovery endpoint:"
DISC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:9980/hosting/discovery 2>/dev/null)
if [ "$DISC_STATUS" = "200" ]; then
    echo "   OK: /hosting/discovery returns 200"
else
    echo "   FAIL: /hosting/discovery returns $DISC_STATUS"
fi

# 4. Check Collabora config — what hosts are allowed
echo ""
echo "4. Collabora allowed WOPI hosts (from container env):"
docker exec project-s-collabora env 2>/dev/null | grep -i "alias" | while read line; do
    echo "   $line"
done
echo "   extra_params:"
docker exec project-s-collabora env 2>/dev/null | grep "extra_params" | while read line; do
    echo "   $line"
done

# 5. Check Collabora logs for WOPI rejections
echo ""
echo "5. Recent WOPI errors in Collabora logs (last 50 lines):"
docker logs project-s-collabora 2>&1 | tail -50 | grep -i "wopi\|unauthorized\|alias\|host.*allow\|No acceptable" | while read line; do
    echo "   $line"
done
if ! docker logs project-s-collabora 2>&1 | tail -50 | grep -qi "wopi\|unauthorized\|alias"; then
    echo "   (none found)"
fi

# 6. Check Nextcloud richdocuments config
echo ""
echo "6. Nextcloud richdocuments configuration:"
echo "   wopi_url (container→Collabora):"
docker exec -u www-data project-s-nextcloud php occ config:app:get richdocuments wopi_url 2>/dev/null | while read line; do echo "   $line"; done
echo "   public_wopi_url (browser→Collabora):"
docker exec -u www-data project-s-nextcloud php occ config:app:get richdocuments public_wopi_url 2>/dev/null | while read line; do echo "   $line"; done
echo "   richdocuments enabled:"
docker exec -u www-data project-s-nextcloud php occ app:list --shipped=false 2>/dev/null | grep -i "richdocuments" | while read line; do echo "   $line"; done

# 7. Check Nextcloud OVERWRITEHOST
echo ""
echo "7. Nextcloud URL config:"
echo "   overwritehost:"
docker exec -u www-data project-s-nextcloud php occ config:system:get overwritehost 2>/dev/null | while read line; do echo "   $line"; done
echo "   overwriteprotocol:"
docker exec -u www-data project-s-nextcloud php occ config:system:get overwriteprotocol 2>/dev/null | while read line; do echo "   $line"; done
echo "   trusted_domains:"
docker exec -u www-data project-s-nextcloud php occ config:system:get trusted_domains 2>/dev/null | while read line; do echo "   $line"; done

# 8. Test Collabora capabilities (no auth required)
echo ""
echo "8. Collabora capabilities endpoint:"
CAP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:9980/hosting/capabilities 2>/dev/null)
echo "   Status: $CAP_STATUS"
if [ "$CAP_STATUS" = "200" ]; then
    echo "   OK: Collabora is serving WOPI capabilities"
else
    echo "   FAIL: Capabilities endpoint returned $CAP_STATUS"
    echo "   This means Collabora's WOPI service is not ready."
fi

# 9. Network connectivity test
echo ""
echo "9. Network: Can Nextcloud reach Collabora?"
NC_TO_COLLAB=$(docker exec project-s-nextcloud curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://collabora:9980/ 2>/dev/null)
echo "   Nextcloud → collabora:9980: $NC_TO_COLLAB"
if [ "$NC_TO_COLLAB" = "200" ] || [ "$NC_TO_COLLAB" = "301" ]; then
    echo "   OK: Nextcloud can reach Collabora via Docker DNS"
else
    echo "   FAIL: Nextcloud cannot reach Collabora"
    echo "   This is the root cause. Check Docker networking."
fi

echo ""
echo "========================================"
echo "  Diagnostic complete"
echo "========================================"
