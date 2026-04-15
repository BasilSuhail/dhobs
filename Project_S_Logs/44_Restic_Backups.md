# 44 — Restic Incremental Backups (Issue #203)

**Date:** April 13, 2026  
**Author:** Author  
**Related Issue:** #203  
**Branch:** `feat/restic-backups`  
**Status:** In progress

---

## Context

Current backup system (`backup-sidecar`) creates full `.tar.gz` archives.  
**Problem:** If you have 500GB of media, every daily backup is 500GB. Slow, wasteful, impractical.

**Goal:** Migrate to Restic — incremental, deduplicated, encrypted snapshots.  
Backups take seconds (only changed data), storage is MB/GB per day.

---

## Technical Plan

### 1. Replace tar logic with Restic
- Add Restic binary to backup-sidecar Dockerfile
- Replace `runBackupJob()` in `snapshot.ts`
- Initialize repo once: `restic init --repo /data/backups/restic`
- Daily: `restic backup /snapshots/... --repo /data/backups/restic`

### 2. Dashboard API
- `GET /api/backup` → list snapshots, sizes, dates
- `POST /api/backup` → trigger manual backup
- `POST /api/backup/restore/:snapshotId` → restore from snapshot

### 3. Scheduling
- Cron-based (daily at 3 AM, configurable)
- Retention policy: keep 7 daily, 4 weekly, 12 monthly

### 4. Migration
- Script to import existing `.enc` tar backups into Restic repo

---

## Acceptance Criteria
- [ ] Restic repo initializes automatically
- [ ] Daily snapshots are fast (incremental)
- [ ] Dashboard shows backup history + status
- [ ] One-click restore works
- [ ] Supports local and remote repos (S3, B2)
