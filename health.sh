#!/bin/bash
# HomeForge External Health Monitor
# Run this on the host machine to check if all services are alive.
# Usage: ./health.sh [--log]
# If --log is used, appends output to /var/log/homeforge-health.log

set -uo pipefail

LOG_FILE="/var/log/homeforge-health.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOGGING=false

if [[ "${1:-}" == "--log" ]]; then
    LOGGING=true
fi

declare -A SERVICES=(
    ["Dashboard"]="http://localhost:3069"
    ["Nginx"]="http://localhost:443"
    ["Nextcloud"]="http://localhost:8081/status.php"
    ["Jellyfin"]="http://localhost:8096/health"
    ["Matrix"]="http://localhost:8008/health"
    ["Vaultwarden"]="http://localhost:8083/alive"
    ["OpenWebUI"]="http://localhost:8085"
    ["Kiwix"]="http://localhost:8087"
    ["Theia"]="http://localhost:3030"
    ["Collabora"]="http://localhost:9980"
)

if $LOGGING; then
    echo "🩺 Health Check: $TIMESTAMP" >> "$LOG_FILE"
else
    echo "🩺 HomeForge Health Check: $TIMESTAMP"
    echo "========================================="
fi

ALERT_COUNT=0
TOTAL=${#SERVICES[@]}

for SERVICE in "${!SERVICES[@]}"; do
    URL="${SERVICES[$SERVICE]}"
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL" 2>/dev/null)
    
    if [[ "$STATUS_CODE" =~ ^[23] ]]; then
        STATUS="✅ UP"
    else
        STATUS="❌ DOWN ($STATUS_CODE)"
        ((ALERT_COUNT++))
    fi

    if $LOGGING; then
        echo "   $SERVICE -> $STATUS" >> "$LOG_FILE"
    else
        printf "  %-20s %s\n" "$SERVICE" "$STATUS"
    fi
done

if $LOGGING; then
    echo "   Summary: $((TOTAL - ALERT_COUNT))/$TOTAL services healthy." >> "$LOG_FILE"
    if [ $ALERT_COUNT -gt 0 ]; then
        echo "   ⚠️  ALERT: $ALERT_COUNT services down!" >> "$LOG_FILE"
    fi
    echo "----------------------------------------" >> "$LOG_FILE"
else
    echo ""
    echo "   Summary: $((TOTAL - ALERT_COUNT))/$TOTAL services healthy."
    if [ $ALERT_COUNT -gt 0 ]; then
        echo "   ⚠️  ALERT: $ALERT_COUNT services are down!"
    fi
fi
