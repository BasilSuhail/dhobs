#!/bin/bash
# HomeForge Rollback Script
# Restores the most recent backup and restarts all services.
set -euo pipefail

BACKUP_DIR="./data/backups"

echo "↩️  HomeForge Rollback"
echo "====================="

# 1. Find latest backup
echo ""
echo "Step 1: Finding latest backup..."
LATEST=$(ls -t "$BACKUP_DIR"/homeforge-backup-*.tar.gz 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
    echo "   ❌ No backups found in $BACKUP_DIR"
    exit 1
fi

SIZE=$(du -h "$LATEST" | cut -f1)
echo "   ✅ Found: $(basename "$LATEST") ($SIZE)"

# 2. Confirm
echo ""
echo "   This will stop all services, restore data, and restart."
echo "   Continue? (y/N)"
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

# 3. Stop services
echo ""
echo "Step 2: Stopping services..."
docker compose down
echo "   ✅ Services stopped."

# 4. Restore data
echo ""
echo "Step 3: Restoring data from backup..."
if tar -xzf "$LATEST" --overwrite 2>/dev/null; then
    echo "   ✅ Data restored from $(basename "$LATEST")"
else
    echo "   ❌ Failed to extract backup."
    exit 1
fi

# 5. Restart services
echo ""
echo "Step 4: Restarting services..."
if docker compose up -d; then
    echo "   ✅ Services restarted."
else
    echo "   ❌ Failed to restart services."
    exit 1
fi

# 6. Verify
echo ""
echo "Step 5: Verifying service health (60s timeout)..."
sleep 15
UNHEALTHY=$(docker compose ps --format '{{.Name}} {{.Status}}' 2>/dev/null | grep -i "unhealthy" | awk '{print $1}' || true)
if [ -z "$UNHEALTHY" ]; then
    echo "   ✅ All services healthy."
    echo ""
    echo "✅ Rollback complete. Restored from: $(basename "$LATEST")"
else
    echo "   ⚠️  Unhealthy services: $UNHEALTHY"
    echo "   Manual intervention may be needed."
fi
