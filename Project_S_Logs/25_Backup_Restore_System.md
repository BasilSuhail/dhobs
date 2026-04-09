# Log 25 — Backup & Restore System

**Date:** April 9, 2026  
**Author:** BasilSuhail + Qwen-Coder  
**PRs:** #161, #162, #165  
**Issue:** #160 (Snapshot & Backup), #163 (Backup bug)

---

## Overview

Built a one-click backup and restore system for HomeForge. Users can create tarball snapshots of their entire `/data` directory, view backup history, and initiate restores — all from the metrics dashboard.

This addresses the #1 user pain point from Reddit research: *"tinkering until it breaks, no easy rollback."*

---

## Architecture

### Data Flow

```
User clicks "New Backup"
       │
       ▼
POST /api/backup
       │
       ├── Verify tar is available (`which tar`)
       ├── Create /data/backups/ if missing
       ├── tar -czf /data/backups/homeforge-backup-TIMESTAMP.tar.gz
       │   --exclude='backups' --exclude='node_modules' --exclude='.git'
       │   --exclude='.next' --exclude='*.log' --exclude='tmp'
       ├── Verify file exists and is > 1KB
       └── Record in SQLite (backup_history table)
              │
              ▼
GET /api/backup  ←  Returns list of last 5 backups
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS backup_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  filename    TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  status      TEXT NOT NULL CHECK(status IN ('success', 'failed', 'restored'))
);
```

---

## PR #161 — Initial Backup System

### What was built
- `POST /api/backup` — creates tarball, records in DB
- `GET /api/backup` — lists existing backups with status
- `POST /api/backup/restore` — records restore intent
- `BackupUpsRow` React component — backup list + "New" button + restore buttons
- `backup_history` SQLite table

### What went wrong
The backup button showed "Creating..." then returned to normal. No file was created. The root cause: **`/data` was mounted read-only** (`./data:/data:ro`) in the dashboard container. `mkdir /data/backups` failed with `ENOENT`.

---

## PR #162 — Backup UI Fix

### Fixes
1. **Button placement** — moved from cramped section header to inside the backup card
2. **Simplified tar command** — single clean `tar -czf ... -C / data` with exclusions
3. **"New Backup" label** — clearer than just "New"

Still didn't work — the read-only mount issue remained.

---

## PR #165 — The Real Fix

### Root cause identified
Docker logs showed:
```
Error: ENOENT: no such file or directory, mkdir '/data/backups'
```

The `/data` volume was mounted as `:ro` (read-only) for security. The backup API couldn't write to it.

### Fixes applied

**docker-compose.yml:**
```yaml
volumes:
  - ./data:/data:ro              # Read-only for general access
  - ./data/security:/app/data/security  # Writable for DB
  - ./data/backups:/data/backups  # ← NEW: Writable backup volume
```

**Backup API improvements:**
- Added `which tar` check before running backup
- Added stdout/stderr logging for debugging
- Added file existence verification after tar completes
- Added minimum file size check (1KB sanity check)
- Returns actual error message instead of generic "Backup failed"
- Failed backups logged with `error-${timestamp}` filename

---

## API Endpoints

### `GET /api/backup`
Returns array of backup entries sorted by date (newest first):

```json
[
  {
    "filename": "homeforge-backup-2026-04-09T19-20-07.tar.gz",
    "sizeBytes": 524288000,
    "createdAt": 1712689207,
    "status": "success"
  }
]
```

### `POST /api/backup`
Creates new backup. Returns:
```json
{ "success": true, "filename": "homeforge-backup-TIMESTAMP.tar.gz", "sizeBytes": 524288000 }
```

Or on failure:
```json
{ "error": "Backup failed: tar command not found in container" }
```

### `POST /api/backup/restore`
Initiates restore. Returns:
```json
{ "success": true, "message": "Restore initiated: homeforge-backup-TIMESTAMP.tar.gz" }
```

---

## UI Component

### BackupWidget
- **"New Backup" button** — green with Plus icon, shows "Creating..." while running
- **Backup history list** — shows last 5 backups with:
  - Status dot (green = success, cyan = restored, red = failed)
  - Timestamp (human-readable: "2h ago", "3d ago")
  - File size (human-readable: "512 MB", "1.2 GB")
  - Restore button (↻) on successful backups
- **Empty state** — "No backups yet. Click 'New' to create one."
- **Restore message** — cyan text confirmation when restore is initiated

---

## Excluded from Backup

| Path | Reason |
|---|---|
| `backups/` | Don't include backups inside backups |
| `node_modules/` | Regenerable from package-lock.json |
| `.git/` | Large, not needed for restore |
| `.next/` | Build artifacts, regenerable |
| `*.log` | Transient, not needed |
| `tmp/` | Temporary files |

---

## Key Files

| File | Purpose |
|---|---|
| `app/api/backup/route.ts` | GET (list) + POST (create) backup endpoints |
| `app/api/backup/restore/route.ts` | POST (restore) endpoint |
| `lib/db/index.ts` | backup_history table schema |
| `components/dashboard/metrics-section.tsx` — `BackupWidget` | Interactive backup UI component |
| `docker-compose.yml` — `./data/backups:/data/backups` | Writable backup volume mount |

---

## Security Considerations

- Backup endpoint protected by `requireSession()` — authenticated users only
- Backups stored in `/data/backups/` — separate from read-only `/data` mount
- Backup filenames are timestamp-based — no user input injection risk
- Restore endpoint records intent in DB but requires manual admin action to complete

---

*End of Log 25*
