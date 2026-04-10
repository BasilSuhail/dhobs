#!/bin/bash
# HomeForge Safe Update Script
# Creates a backup, validates it, then pulls and applies updates.
# Aborts if backup fails.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="./data/backups"

echo "🔄 HomeForge Safe Update"
echo "========================="

# 1. Pre-update check
echo ""
echo "Step 1: Pre-update safety check..."
if bash "$SCRIPT_DIR/pre-update-check.sh"; then
    echo "   Pre-update checks passed."
else
    echo "   ⚠️  Pre-update checks failed. Continue anyway? (y/N)"
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "Aborted."
        exit 1
    fi
fi

# 2. Create backup
echo ""
echo "Step 2: Creating backup..."
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S" | tr ':.' '-_')
FILENAME="homeforge-backup-${TIMESTAMP}.tar.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

if tar -czf "$FILEPATH" \
    --exclude='backups' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next' \
    --exclude='*.log' \
    --exclude='tmp' \
    --exclude='data/media' \
    --exclude='data/kiwix' \
    --exclude='data/ollama' \
    data/ 2>/dev/null; then
    SIZE=$(du -h "$FILEPATH" | cut -f1)
    echo "   ✅ Backup created: $FILENAME ($SIZE)"
else
    echo "   ❌ Backup failed. Aborting update."
    rm -f "$FILEPATH"
    exit 1
fi

# Validate backup is not empty
BACKUP_SIZE=$(stat -f%z "$FILEPATH" 2>/dev/null || stat -c%s "$FILEPATH" 2>/dev/null || echo 0)
if [ "$BACKUP_SIZE" -lt 1024 ]; then
    echo "   ❌ Backup too small (${BACKUP_SIZE} bytes). Aborting update."
    rm -f "$FILEPATH"
    exit 1
fi

# 3. Pull new images
echo ""
echo "Step 3: Pulling new images..."
if docker compose pull; then
    echo "   ✅ Images pulled successfully."
else
    echo "   ❌ Failed to pull images. Your current setup is unchanged."
    exit 1
fi

# 4. Apply update
echo ""
echo "Step 4: Applying update..."
if docker compose up -d; then
    echo "   ✅ Services restarted."
else
    echo "   ❌ Failed to restart services. Restoring from backup..."
    bash "$SCRIPT_DIR/rollback.sh"
    exit 1
fi

# 5. Verify health
echo ""
echo "Step 5: Verifying service health (60s timeout)..."
sleep 10
UNHEALTHY=$(docker compose ps --format '{{.Name}} {{.Status}}' 2>/dev/null | grep -i "unhealthy" | awk '{print $1}' || true)
if [ -z "$UNHEALTHY" ]; then
    echo "   ✅ All services healthy."
    echo ""
    echo "✅ Update complete. Backup saved to: $FILEPATH"
else
    echo "   ⚠️  Unhealthy services: $UNHEALTHY"
    echo "   To rollback: bash scripts/rollback.sh"
fi
