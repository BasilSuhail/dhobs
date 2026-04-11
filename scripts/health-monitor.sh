#!/bin/bash
# HomeForge Health Monitor
# Checks all services and logs status to /var/log/homeforge-health.log
# Usage: bash scripts/health-monitor.sh

set -uo pipefail

LOG_FILE="/var/log/homeforge-health.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Map of service name -> port (or protocol/port)
declare -A SERVICES=(
    ["Dashboard"]="3069"
    ["Nginx"]="443"
    ["Nextcloud"]="8081"
    ["Jellyfin"]="8096"
    ["Matrix"]="8008"
    ["Vaultwarden"]="8083"
    ["OpenWebUI"]="8085"
    ["Ollama"]="11434"
    ["Kiwix"]="8087"
    ["Theia"]="3030"
    ["Collabora"]="9980"
    ["OpenVPN"]="1194:udp"
)

echo "🩺 Health Check: $TIMESTAMP" >> "$LOG_FILE"

ALERT_COUNT=0

for SERVICE in "${!SERVICES[@]}"; do
    TARGET="${SERVICES[$SERVICE]}"
    
    if [[ "$TARGET" == *:* ]]; then
        PORT="${TARGET%%:*}"
        PROTO="${TARGET##*:}"
    else
        PORT="$TARGET"
        PROTO="tcp"
    fi

    # Use /dev/tcp for TCP, nc for UDP
    if [ "$PROTO" == "tcp" ]; then
        if (echo > /dev/tcp/localhost/$PORT) &>/dev/null; then
            STATUS="✅ UP"
        else
            STATUS="❌ DOWN"
            ((ALERT_COUNT++))
        fi
    else
        if nc -z -u -w1 localhost $PORT &>/dev/null; then
            STATUS="✅ UP"
        else
            STATUS="❌ DOWN"
            ((ALERT_COUNT++))
        fi
    fi

    echo "   $SERVICE ($PROTO:$PORT) -> $STATUS" >> "$LOG_FILE"
done

echo "   Summary: $(( ${#SERVICES[@]} - ALERT_COUNT ))/${#SERVICES[@]} services healthy." >> "$LOG_FILE"
if [ $ALERT_COUNT -gt 0 ]; then
    echo "   ⚠️  ALERT: $ALERT_COUNT services are down!" >> "$LOG_FILE"
fi
echo "----------------------------------------" >> "$LOG_FILE"
