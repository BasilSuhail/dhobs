# 37 — Update & Rollback Strategy (Phase 9)

Date: 2026-04-10
Author: Basil Suhail
Related Issue: #182
Branch: `phase-9/update-rollback`
PR: TBD

---

## Context

Upgrading HomeForge currently has no safety net. The process is: change image tags in `docker-compose.yml` and run `docker compose up -d`. If a new image breaks compatibility (bad Nextcloud config, MariaDB migration failure), the user has no rollback path and no automated backup before the update.

Architecture review (#182) scored this as a "missing entirely" finding.

---

## Changes Made

### 1. Version Pinning Policy in `docker-compose.yml`

Added `## version` comments to every service documenting:
- Current pinned version
- Update policy (pin to major vs `:latest`)
- Known breaking changes

**Pin policy by service:**
| Service | Policy | Reason |
|---|---|---|
| Jellyfin | Pin to `major.minor.patch` | Stable releases, safe to pin |
| Nextcloud | Pin to `major` only | Minor updates include security fixes |
| MariaDB | Pin to `major.minor` | Migration between major versions is one-way |
| Collabora | Pin to full version | Known compatibility with Nextcloud 30 |
| Synapse | Pin to full version | Breaking changes between minors |
| Element | Pin to full version | Cosmetic updates only |
| Vaultwarden | Pin to full version | Database schema changes between minors |
| Ollama | Pin to full version | Model compatibility between versions |
| Open-WebUI | Pin to full version | API changes between minors |
| Theia IDE | `:latest` only | Upstream only publishes `:latest` |
| Kiwix | Pin to full version | ZIM format changes rarely |
| OpenVPN | `:latest` | Stable, no breaking changes in years |

### 2. `scripts/update.sh` — Safe Update Script

Workflow:
1. Run pre-update check (backup exists, services healthy)
2. Create backup automatically
3. Verify backup succeeded (archive > 1KB, .tar.gz valid)
4. `docker compose pull` (download new images)
5. `docker compose up -d` (apply update)
6. Wait for health checks (60s timeout)
7. Report which services are healthy vs unhealthy

If backup fails at step 2: abort, no update applied.

### 3. `scripts/rollback.sh` — Restore from Latest Backup

Workflow:
1. Find most recent backup archive in `data/backups/`
2. Stop all containers (`docker compose down`)
3. Extract backup to `./data/` (preserves directory structure)
4. `docker compose up -d` (restart with restored data)
5. Report rollback completion

### 4. `scripts/pre-update-check.sh` — Safety Gate

Checks before any update:
1. Backup exists and is valid (or offers to create one)
2. All currently running services are healthy
3. MariaDB and Postgres are reachable
4. Disk space is sufficient (> 2x backup size free)
5. Warns if `docker-compose.yml` has been modified (uncommitted changes)

---

## Impact Assessment

| Metric | Before | After |
|---|---|---|
| Update safety | Manual, no backup | Automated pre-update backup |
| Rollback capability | Manual restore from tar | `rollback.sh` one command |
| Version visibility | Image tags only | Documented pin policy per service |
| Pre-update awareness | None | Health checks, disk space, backup status |
| Update risk | High | Low (abort on backup failure) |

---

## Testing

- `scripts/update.sh` creates backup before pulling new images
- `scripts/rollback.sh` restores from latest backup
- `scripts/pre-update-check.sh` reports all checks passed or lists failures
- Version pin comments visible in `docker-compose.yml`

---

**Status:** In progress.
