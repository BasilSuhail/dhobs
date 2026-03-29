#!/bin/bash
# Project S: Service Health Check

echo "Project S — Service Health Check"
echo "================================"

check_service() {
    local name=$1
    local url=$2
    local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
    if [ "$status" -ge 200 ] && [ "$status" -lt 400 ]; then
        printf "  %-20s %s\n" "$name" "OK ($status)"
    else
        printf "  %-20s %s\n" "$name" "DOWN ($status)"
    fi
}

check_service "Dashboard" "http://localhost:3069"
check_service "Jellyfin" "http://localhost:8096"
check_service "Nextcloud" "http://localhost:8081"
check_service "Collabora" "http://localhost:9980"
check_service "Theia IDE" "http://localhost:3030"
check_service "Matrix" "http://localhost:8008"
check_service "Element" "http://localhost:8082"
check_service "Vaultwarden" "http://localhost:8083"
check_service "Kiwix" "http://localhost:8084"

echo ""
echo "Docker Containers:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker-compose ps 2>/dev/null
