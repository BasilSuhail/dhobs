# 07 — Docker Integration Audit

Date: 2026-03-26
Author: Author (basilsuhailkhan@proton.me)
Related Issues: #12 (hardcoded IP), #13 (Docker setup blockers)
Branch: `fix/replace-hardcoded-ip`

---

## Context

Contributor added Docker containerization for the Project S stack in commits `66bb1a9` through `8910721`. This includes a `docker-compose.yml` with Jellyfin, Nextcloud, MariaDB, and the dashboard, plus a Docker-in-Docker setup for isolated environments.

This audit was performed after pulling his changes and finding that `localhost:8081` (Nextcloud) and `localhost:8096` (Jellyfin) returned `ERR_CONNECTION_REFUSED`.

---

## What Saad Built

### Files Added

| File | Purpose |
|---|---|
| `docker-compose.yml` | 4-service stack: Jellyfin, Nextcloud, MariaDB, Dashboard |
| `Dashboard/Dashboard1/Dockerfile` | Multi-stage production build (node:20-alpine, standalone output) |
| `Dockerfile.dind` | Docker-in-Docker master container (docker:24-dind) |
| `run-dind.sh` | Shell script to build and launch the DinD environment |
| `components/dashboard/media-section.tsx` | Jellyfin iframe embed (full-screen, glass border) |
| `components/dashboard/nextcloud-section.tsx` | Nextcloud iframe embed (same pattern) |
| `components/dashboard/storage-section.tsx` | File manager UI with drag-drop upload, search, file type icons |
| `cache/jellyfin/fontconfig/*` | Jellyfin runtime cache files (should not be in repo) |

### Architecture (Saad's Docker Setup)

```
Host Machine
├── Docker Desktop (must be running)
│   └── docker compose up
│       ├── project-s-jellyfin    → :8096
│       ├── project-s-nextcloud   → :8081
│       ├── project-s-nextcloud-db (MariaDB, internal)
│       └── project-s-dashboard   → :3069 (production build)
│
└── Next.js Dev Server (separate)
    └── npx next dev --port 5111
```

Alternative: DinD approach (`run-dind.sh`) runs Docker inside Docker in privileged mode, nesting the entire compose stack inside a single container.

### Sidebar Navigation Changes

Saad changed the sidebar from static section IDs to a routing system:
- `dashboard` → renamed to `home`
- `media` → shows Jellyfin iframe
- `nextcloud` → external link to `:8081`
- `storage` → shows file manager UI
- Added `onNavigate` prop to WelcomeSection

### CodeSpace Decision

Changed the proposed CodeSpace IDE from VS Code (`code-server`) to **Eclipse Theia** — a VS Code fork with MIT license and full web UI. Updated in `01_Proposed_Development_Cycle.md`.

---

## Issues Found (9 Total)

### Critical (prevents services from running)

| # | Issue | Impact |
|---|---|---|
| 1 | Docker daemon not running | Nothing starts. No docs say to launch Docker Desktop first |
| 2 | No setup instructions | New contributor cannot get the stack running |

### High (will cause problems on other machines)

| # | Issue | Impact |
|---|---|---|
| 3 | Hardcoded IP `192.168.1.68` | Iframes break on any other network (fixed in `fix/replace-hardcoded-ip` branch) |
| 4 | Hardcoded DB credentials | `nextcloud`/`nextcloud` in plain text in compose file. Should be `.env` |
| 5 | Dashboard port conflict | Compose maps `:3069`, dev server uses `:5111` — confusing if both run |

### Medium (tech debt / cleanup)

| # | Issue | Impact |
|---|---|---|
| 6 | `version: '3.8'` deprecated | Docker Compose V2 prints warning, field is ignored |
| 7 | `links` is legacy | Should use `depends_on` — services already share a network |
| 8 | Jellyfin cache committed | Binary files in repo, machine-specific, ~50KB of noise |
| 9 | `run-dind.sh` uses `sudo` | Not needed on macOS Docker Desktop, may cause permission issues |

---

## Fixes Applied So Far

### Branch: `fix/replace-hardcoded-ip` (commit `d585930`)

Replaced all `192.168.1.68` references with `localhost`:
- `media-section.tsx` — Jellyfin iframe
- `nextcloud-section.tsx` — Nextcloud iframe
- `sidebar.tsx` — Nextcloud nav link
- `welcome-section.tsx` — App quick links
- `docker-compose.yml` — Removed hardcoded IP from Nextcloud trusted domains

---

## Remaining Work

- [ ] Add Getting Started documentation (how to run the stack)
- [ ] Move credentials to `.env.example`
- [ ] Remove `version: '3.8'` from compose
- [ ] Replace `links` with `depends_on` for Nextcloud → db
- [ ] `git rm -r --cached cache/` to untrack Jellyfin cache
- [ ] Remove `sudo` from `run-dind.sh` or make it platform-aware
- [ ] Create `docker-compose.dev.yml` override for development workflow
- [ ] Document the Theia CodeSpace decision in the main roadmap
