# 38 — Backup Sidecar Migration

Date: 2026-04-10
Author: Author
Related Issue: #161, #162, #165
Branch: `feature/backup-sidecar`
PR: TBD

---

## Context

The previous backup implementation (Log 25) was integrated directly into the dashboard container. This created several architectural and security risks:
1. **Circular Dependency:** If the dashboard container crashed, the restore mechanism (stored inside it) was inaccessible.
2. **Limited Scope:** It only backed up the dashboard's own application directory, ignoring Jellyfin, Nextcloud, Matrix, and other critical service volumes.
3. **Security Regression:** Backup archives were stored in plaintext, violating HomeForge's encryption-first mandate.
4. **Data Corruption:** It ran `tar` against live SQLite databases without pausing the processes, risking inconsistent snapshots.

This migration replaces the internal logic with a dedicated, isolated sidecar container.

---

## Changes Made

### 1. Dedicated Sidecar Service (`homeforge-backup`)

Created a standalone Node.js service in `backup-sidecar/` that operates independently of all other containers.

**Architecture details:**
- **Read-only volume access:** Mounts every service data directory as read-only (e.g., `/snapshots/jellyfin:ro`).
- **Docker Socket access:** Accesses `/var/run/docker.sock` to pause/unpause containers during snapshots and stop/start them during restores.
- **Isolated Network:** Communicates with the dashboard over the internal Docker network on port `3070`; the port is not exposed to the host.

### 2. Encryption-First Implementation

Aligned the backup system with the security model established in Log 24.
- **Key Derivation:** The sidecar reads the master entropy key (`.homeforge.key`) and derives a unique `BACKUP_KEY` and `INTERNAL_TOKEN` using HKDF-SHA512.
- **Encrypted Database:** The sidecar's own history database (`backup.db`) is encrypted via SQLCipher (AES-256-GCM).
- **Encrypted Archives:** Every backup archive is encrypted using AES-256-GCM with a per-archive random IV before being written to disk. Plaintext `.tar.gz` files are deleted immediately after encryption.

### 3. Atomic Snapshot & Restore Logic

**Snapshot Process (`snapshot.ts`):**
1. Run `mysqldump` for MariaDB (Nextcloud database).
2. `docker pause <container>` to freeze filesystem writes.
3. Perform an OS-level copy (`cp -a`) of the frozen volume.
4. `docker unpause <container>` to resume service (minimizing downtime).
5. Compress and encrypt the staged copy.

**Restore Process (`restore.ts`):**
1. Verify SHA-256 checksum of the encrypted archive.
2. Decrypt archive to `/tmp`.
3. `docker stop <container>` (required for full volume replacement).
4. Wipe target volume and extract backup.
5. `docker start <container>` and verify health.

### 4. Dashboard Integration & UI Updates

- **API Proxy:** The dashboard routes (`/api/backup`, `/api/backup/restore`) now act as authenticated proxies to the sidecar.
- **Service Selection:** Users can now select specific services to back up or choose "All Services."
- **Restore Confirmation:** Added a high-visibility modal warning that restoration is a destructive operation that stops services.
- **Async Polling:** The `BackupWidget` now polls the sidecar API every 2 seconds to provide live progress updates for ongoing jobs.

---

## Impact Assessment

| Metric | Before (Log 25) | After (Sidecar) |
|---|---|---|
| **Security** | Plaintext archives | AES-256-GCM encrypted |
| **Reliability** | Live snapshot (corruption risk) | Atomic pause/unpause snapshots |
| **Scope** | Dashboard data only | Full system (all services) |
| **Independence** | Dashboard-dependent | Standalone container |
| **Auth** | Same as dashboard | Internal token-based (HKDF derived) |
| **RBAC** | Any user could restore | `admin` role required for restore |

---

## Files Created/Modified

- `backup-sidecar/`: Complete source code for the sidecar service.
- `docker-compose.yml`: Added `homeforge-backup` service and volume definitions.
- `Dashboard/Dashboard1/app/api/backup/`: Converted to proxy handlers.
- `Dashboard/Dashboard1/components/dashboard/metrics-section.tsx`: Rebuilt `BackupWidget`.
- `Dashboard/Dashboard1/lib/db/index.ts`: Removed `backup_history` schema.

---

**Status:** Completed and Verified.
