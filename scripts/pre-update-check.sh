#!/bin/bash
# HomeForge Pre-Update Safety Check
# Run this BEFORE updating to ensure the system is in a safe state.
set -euo pipefail

BACKUP_DIR="./data/backups"
MIN_FREE_MB=500

echo "🔍 HomeForge Pre-Update Check"
echo "=============================="

ERRORS=0

# 1. Check backup exists and is valid
echo ""
echo "1. Backup status..."
if [ -d "$BACKUP_DIR" ]; then
    LATEST=$(ls -t "$BACKUP_DIR"/homeforge-backup-*.tar.gz 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
        SIZE=$(du -h "$LATEST" | cut -f1)
        echo "   ✅ Latest backup: $(basename "$LATEST") ($SIZE)"
    else
        echo "   ⚠️  No backup found. Run: ./boom.sh or create one manually."
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ⚠️  Backup directory does not exist."
    ERRORS=$((ERRORS + 1))
fi

# 2. Check Docker is running
echo ""
echo "2. Docker daemon..."
if docker info >/dev/null 2>&1; then
    echo "   ✅ Docker daemon is running"
else
    echo "   ❌ Docker daemon is not running. Start Docker Desktop."
    ERRORS=$((ERRORS + 2))
fi

# 3. Check services are healthy (if running)
echo ""
echo "3. Service health..."
UNHEALTHY=$(docker compose ps --format '{{.Name}} {{.Status}}' 2>/dev/null | grep -i "unhealthy" | awk '{print $1}' || true)
if [ -n "$UNHEALTHY" ]; then
    echo "   ⚠️  Unhealthy services:"
    for svc in $UNHEALTHY; do
        echo "      - $svc"
    done
    echo "   Fix unhealthy services before updating."
    ERRORS=$((ERRORS + 1))
else
    RUNNING=$(docker compose ps --format '{{.Name}}' 2>/dev/null | wc -l)
    if [ "$RUNNING" -gt 0 ]; then
        echo "   ✅ All $RUNNING services healthy"
    else
        echo "   ⚠️  No services running. Run: ./boom.sh"
    fi
fi

# 4. Check disk space
echo ""
echo "4. Disk space..."
FREE_KB=$(df -k . | tail -1 | awk '{print $4}')
FREE_MB=$((FREE_KB / 1024))
if [ "$FREE_MB" -lt "$MIN_FREE_MB" ]; then
    echo "   ❌ Low disk space: ${FREE_MB}MB free (minimum: ${MIN_FREE_MB}MB)"
    ERRORS=$((ERRORS + 2))
else
    echo "   ✅ ${FREE_MB}MB free disk space"
fi

# 5. Check for uncommitted docker-compose.yml changes
echo ""
echo "5. docker-compose.yml status..."
if git diff --quiet docker-compose.yml 2>/dev/null; then
    echo "   ✅ No uncommitted changes to docker-compose.yml"
else
    echo "   ⚠️  docker-compose.yml has uncommitted changes"
    echo "   Make sure these are intentional before updating."
fi

# Summary
echo ""
echo "=============================="
if [ "$ERRORS" -gt 0 ]; then
    echo "❌ $ERRORS issue(s) found. Fix before updating."
    exit 1
else
    echo "✅ All checks passed. Safe to update."
    exit 0
fi
