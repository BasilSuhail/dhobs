# 34 — Data Volume Contract (Phase 5)

Date: 2026-04-10
Author: Author
Related Issue: #176
Branch: `phase-5/data-volume-contract`
PR: #181

---

## Context

The `./data/` directory was a flat hierarchy with no documented contract for what's config, what's state, what's user data, and what the backup system includes/excludes. The entire directory was `.gitignore`'d — `data/README.md` was the only guide for fresh clones, and it lived inside the ignored directory.

---

## Changes Made

### 1. `data/README.md` Created

Full authoritative reference for all persistent data under `./data/`:

**Contents:**
- 12 service data directories documented with purpose, owner, mount type, size expectation
- Backup inclusion/exclusion for each directory
- Mount type reference (ro vs rw, which container mounts what)
- Service ownership table (no cross-service writes)
- Critical data paths identified (6 paths that must never be lost)
- Backup contract documented with known issue (large user directories included in tar)

**Service data reference:**
| Service | Directory | Backup? | Notes |
|---|---|---|---|
| Jellyfin | `data/jellyfin/` | config: yes, cache: no | Cache is disposable |
| Media | `data/media/` | No (user-managed) | Potentially terabytes |
| Nextcloud | `data/nextcloud/` | html: yes, db: yes, user data: no | User files excluded from backup |
| Matrix | `data/matrix/` | Yes | Signing keys are critical |
| Vaultwarden | `data/vaultwarden/` | Yes | High priority — all passwords |
| Open-WebUI | `data/open-webui/` | Yes | Chat history, settings |
| Ollama | `data/ollama/` | No (re-downloadable) | Models can be re-downloaded |
| Kiwix | `data/kiwix/` | No (user-managed) | ZIM files are large |
| VPN | `data/vpn/` | Yes | PKI is critical |
| Workspace | `data/workspace/` | No (user-managed) | User development data |
| Security | `data/security/` | Yes | Highest priority — encrypted user DB |
| Backups | `data/backups/` | No (these ARE the backups) | Archive storage |

### 2. Log 29 Updated

Data volume section now references `data/README.md` as the source of truth. Summary hierarchy, mount types, and backup contract documented.

### 3. Architecture Diagram Added to README.md

Replaced old flat diagram with current segmented architecture showing nginx → services → databases flow with network topology table.

---

## Impact

| Metric | Before | After |
|---|---|---|
| Data hierarchy documented | No (inside `.gitignore`'d dir) | Yes (`data/README.md`) |
| Service ownership defined | Implicit | Explicit table |
| Backup inclusion/exclusion | Single blanket exclude list | Per-directory with rationale |
| Critical data paths identified | None | 6 paths identified |
| Mount type reference | None | Full ro/rw table |

---

**Status:** Merged. PR #181.
