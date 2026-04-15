# 29 — Architecture Overhaul

Date: 2026-04-10
Author: Author
Related Issue: #176
Branches: `phase-1/architecture-docs`, `phase-2/network-segmentation`, `phase-3/nginx-reverse-proxy`, `phase-4/dashboard-internal`

---

## Context

HomeForge has 15 services orchestrated by Docker Compose, a Next.js 16 dashboard, and 28 implementation logs — but no single document that explains how the system fits together. This log is the first step toward a complete architecture record.

**What this log covers:**
- Current system state as of April 10, 2026
- Full service catalog
- Network topology (current reality)
- Data flow and security model
- Data volume structure
- Deployment lifecycle
- Architecture Decision Records (ADRs)

## Status

| Phase | Status | PR |
|---|---|---|
| Phase 1 — Documentation (Architecture doc + ADRs) | ✅ Complete | #177 |
| Phase 2 — Network Segmentation | ✅ Complete | #178 |
| Phase 3 — Reverse Proxy Integration | ✅ Complete | #179 |
| Phase 4 — Dashboard Internal Architecture | ✅ Complete | #180 |
| Phase 5 — Data Volume Contract | ✅ Complete | #181 |
| Phase 6 — Validation | ✅ Complete | — |
| Phase 7 — Security Hardening | ✅ Complete | #183 |
| Phase 8 — Operational Reliability | ✅ Complete | #184 |
| Phase 9 — Update & Rollback Strategy | ✅ Complete | #185 |
| Phase 10 — Docker Socket Proxy | ⏸️ Skipped (overkill for trusted LAN) | — |
| Phase 11 — SSL/TLS | ✅ Complete | #189 |
| Phase 12 — External Health Monitoring | Not started | #188 |

---

## 1. System Overview

HomeForge is a self-hosted digital hub. It replaces cloud subscriptions (Google Drive, Office 365, Netflix, 1Password) with self-hosted open-source alternatives running on hardware the user owns — a Raspberry Pi, an old PC, or a VPS.

```
User's Browser
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  Host Machine (macOS / Linux / Raspberry Pi)             │
│                                                          │
│  docker-compose.yml (15 services)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard    │  │  Nextcloud   │  │   Jellyfin   │  │
│  │  Next.js 16   │  │  :8081       │  │   :8096      │  │
│  │  :3069/3070   │  │  + Collabora │  │   Media      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │           │
│  ┌──────┴───────┐  ┌─────┴────────┐  ┌──────┴───────┐  │
│  │  Matrix/     │  │  Theia IDE   │  │  Vaultwarden │  │
│  │  Element     │  │  :3030       │  │  :8083       │  │
│  │  :8008/8082  │  └──────────────┘  └──────────────┘  │
│  └──────┬───────┘                                      │
│         │               ┌─────────────────────────┐     │
│  ┌──────┴───────┐  ┌───┤  Internal Services      │     │
│  │  Open-WebUI  │  │   │  (not user-facing)       │     │
│  │  :8085       │  │   │                          │     │
│  └──────┬───────┘  │   ├── Ollama :11434          │     │
│         │          │   ├── MariaDB (Nextcloud)    │     │
│  ┌──────┴───────┐  │   ├── Postgres (Matrix)      │     │
│  │  Kiwix       │  │   └── Filebrowser (Kiwix Mgr)│    │
│  │  :8087/8086  │  │                              │     │
│  └──────────────┘  └──────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**Core principles:**
- **Unified** — one login, one dashboard, one update system
- **Private** — encryption keys the user controls, nothing leaves their network
- **Modular** — install only what you need, add more later
- **Simple** — no command line required for day-to-day use

---

## 2. Service Catalog

All 15 services currently defined in `docker-compose.yml`:

### User-Facing Services

| Service | Image | Port | Purpose | Healthcheck |
|---|---|---|---|---|
| **Dashboard** | (local build, Next.js 16) | `:3069` (HTTP), `:3070` (WS) | Central control plane — auth, metrics, terminal, backup | Custom fetch to `:3069` |
| **Jellyfin** | `jellyfin/jellyfin:10.10.6` | `:8096` | Media server — video, music, photos | `curl :8096/health` |
| **Nextcloud** | `nextcloud:30` | `:8081` | Files, calendar, contacts, docs | `curl /status.php` |
| **Collabora** | `collabora/code:24.04.10.2.1` | `:9980` | Document editing (WOPI server for Nextcloud Office) | `curl :9980/` |
| **Theia IDE** | `ghcr.io/eclipse-theia/theia-ide:latest` | `:3030` | Browser-based IDE with terminal and Docker access | Node HTTP check |
| **Matrix Synapse** | `matrixdotorg/synapse:v1.120.0` | `:8008` | Self-hosted encrypted chat server | `curl /health` |
| **Element** | `vectorim/element-web:v1.11.90` | `:8082` | Matrix web client | None |
| **Vaultwarden** | `vaultwarden/server:1.32.7` | `:8083` | Password manager (Bitwarden-compatible) | `curl /alive` |
| **Open-WebUI** | `ghcr.io/open-webui/open-webui:0.8.12` | `:8085` | Local AI chat interface | `curl :8080/` |
| **Kiwix Reader** | `ghcr.io/kiwix/kiwix-serve:3.7.0` | `:8087` | Offline knowledge base (Wikipedia via ZIM files) | None |
| **Kiwix Manager** | `filebrowser/filebrowser:v2.31.2` | `:8086` | File browser for uploading ZIM files to Kiwix | None |
| **OpenVPN** | `d3vilh/openvpn-server:latest` | `:1194/udp` | Self-hosted VPN server | None |
| **OpenVPN UI** | `d3vilh/openvpn-ui:latest` | `:8090` | VPN management web UI | None |

### Internal Services (Not Directly User-Facing)

| Service | Image | Purpose | Dependencies |
|---|---|---|---|
| **MariaDB** | `mariadb:10.11` | Nextcloud database | None (data volume: `./data/nextcloud/db`) |
| **Synapse DB** | `postgres:15-alpine` | Matrix Synapse database | None (data volume: `./data/matrix/db`) |
| **Ollama** | `ollama/ollama:0.20.0` | Local LLM inference engine | None (data volume: `./data/ollama`) |

### Service Dependencies

```
dashboard → jellyfin, nextcloud
nextcloud → db (service_started), collabora (service_healthy)
open-webui → ollama (service_healthy)
synapse → synapse-db
openvpn-ui → openvpn
```

---

## 3. Network Topology (Current State)

Three Docker networks defined in `docker-compose.yml`:

```
frontend network  — dashboard, element, openvpn-ui, kiwix-manager, open-webui, nginx
backend network   — jellyfin, nextcloud, collabora, theia, synapse, vaultwarden, kiwix, ollama, openvpn, nginx
database network  — db (MariaDB), synapse-db (Postgres)

Cross-network assignments:
├── dashboard     → frontend + backend (needs to reach all services for health checks)
├── open-webui    → frontend + backend (needs ollama on backend)
├── nextcloud     → backend + database (needs MariaDB)
├── synapse       → backend + database (needs Postgres)
└── nginx         → frontend + backend (proxies to frontend services + dashboard)
```

**User entry point:** All traffic goes through nginx (`http://<LAN_IP>:<port>`). Direct port access removed from all individual services except OpenVPN UDP 1194 (nginx cannot proxy UDP).

---

## 4. Data Flow

### User Request Flow

```
User browser
    │
    ▼
http://<LAN_IP>:<port>  ← All traffic through nginx (single entry point, port 80 primary)
    │
    ▼
nginx reverse proxy (container: project-s-nginx, frontend + backend networks)
    │
    ├── :80    → dashboard:3069
    ├── :8096  → jellyfin:8096
    ├── :8081  → nextcloud:80
    ├── :9980  → collabora:9980
    ├── :3030  → theia:3000
    ├── :8008  → synapse:8008
    ├── :8082  → element:80
    ├── :8083  → vaultwarden:80
    ├── :8085  → open-webui:8080
    ├── :8087  → kiwix:8080
    ├── :8086  → kiwix-manager:80
    └── :8090  → openvpn-ui:8080
    │
    ▼
Target container responds via Docker internal DNS
    │
    ▼
CSP headers set by nginx config
    │
    ▼
Dashboard may iframe the service (Jellyfin, Nextcloud, Element sections)
```

### Dashboard Request Flow

```
User → Dashboard (:3069)
    │
    ├── middleware.ts — checks iron-session cookie, redirects to /login if unauthenticated
    ├── /login — Argon2id password verification against SQLCipher DB
    ├── /setup — one-time entropy key generation + admin account creation
    ├── /api/* — API routes (auth, backup, kiwix, ollama, stats)
    ├── /kiwix/* — Kiwix content proxy
    └── WebSocket (:3070) — terminal PTY sessions (ticket-authenticated)
```

### Authentication Flow

```
First-time setup:
1. User opens :3069 → redirected to /setup
2. Mouse movement entropy → 128-char hex key (SHA-512 via Web Crypto API)
3. User creates admin account (username + password)
4. Password hashed with Argon2id (64 MiB memory, 3 iterations)
5. HKDF-SHA512 derives SESSION_SECRET, WS_SECRET, DB_KEY from entropy key
6. Database rekeyed from temporary UUID key to entropy-derived DB_KEY
7. Session cookie set (iron-session, HTTP-only, signed)

Subsequent logins:
1. User submits username + password
2. Argon2id hash compared against SQLCipher DB
3. On success: iron-session cookie set
4. All API routes check session via middleware
5. WebSocket terminal requires short-lived HMAC ticket from /api/auth/ws-ticket
```

---

## 5. Security Model

### Encryption at Rest

| Component | Encryption | Key Source |
|---|---|---|
| Dashboard user DB (SQLite) | AES-256-GCM (SQLCipher) | HKDF-derived DB_KEY from entropy key |
| iron-session cookie | AES-256-GCM + HMAC | HKDF-derived SESSION_SECRET |
| WebSocket tickets | HMAC-SHA256 | HKDF-derived WS_SECRET, 30s expiry |
| User passwords | Argon2id | One-way hash, never stored |

### Secrets Management

**Runtime secrets (never written to disk):**
- `SESSION_SECRET` — derived from entropy key at startup
- `WS_SECRET` — derived from entropy key at startup
- `DB_KEY` — derived from entropy key at startup

**Infrastructure secrets (stored in `.env`, not committed):**

| Variable | Used By | Generation |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | Nextcloud MariaDB | `openssl rand -hex 32` |
| `MYSQL_PASSWORD` | Nextcloud MariaDB | `openssl rand -hex 32` |
| `NEXTCLOUD_ADMIN_PASSWORD` | Nextcloud admin | User-defined |
| `COLLABORA_PASSWORD` | Collabora Online admin | `openssl rand -hex 32` |
| `MATRIX_REGISTRATION_SECRET` | Synapse federation | `openssl rand -hex 32` |
| `MATRIX_MACAROON_SECRET_KEY` | Synapse macaroon tokens | `openssl rand -hex 32` |
| `MATRIX_FORM_SECRET` | Synapse CSRF | `openssl rand -hex 32` |
| `WEBUI_SECRET_KEY` | Open-WebUI session | `openssl rand -base64 32` |
| `VPN_ADMIN_PASSWORD` | OpenVPN UI admin | User-defined |

### Rate Limiting

- Login endpoint: 10 attempts per username per 15 minutes (sliding window)
- Returns `X-RateLimit-*` headers

### Container Security

| Service | Privileged | Capabilities | Notes |
|---|---|---|---|
| Dashboard | No (runs as root in container) | None | Mounts `/var/run/docker.sock` |
| Theia IDE | Yes | MKNOD, SYS_ADMIN | Full Docker access for development |
| OpenVPN | Yes | NET_ADMIN | Required for TUN/TAP device |
| OpenVPN UI | Yes | None | Mounts Docker socket for container management |
| Collabora | No | MKNOD, SYS_ADMIN (seccomp:unconfined) | Required for document rendering |

---

## 6. Data Volume Structure

All persistent data lives under `./data/` on the host. The full authoritative reference is at [`data/README.md`](../data/README.md).

**Summary hierarchy:**

```
data/
├── jellyfin/        # Jellyfin config + cache
├── media/           # User media files (movies, music, photos)
├── nextcloud/       # Nextcloud html + user data + MariaDB
├── matrix/          # Synapse data + Postgres database
├── vaultwarden/     # Password vault data
├── open-webui/      # AI chat backend data
├── ollama/          # LLM models
├── kiwix/           # ZIM files (offline knowledge bases)
├── vpn/             # OpenVPN config + certs + PKI
├── workspace/       # Shared workspace (Theia IDE)
├── filebrowser/     # Kiwix manager DB
├── security/        # Dashboard entropy-encrypted user DB
└── backups/         # User-initiated backup archives
```

**Mount types:**
- Dashboard mounts `./data` as read-only (`:ro`) for metrics
- Dashboard mounts `./data/security` and `./data/backups` as read-write
- Each service mounts its own data directory read-write
- No cross-service data writes — each service owns its directory

**Backup contract:**
The automated backup (`app/api/backup/route.ts`) creates a `.tar.gz` of `data/` excluding: `backups/`, `node_modules/`, `.git/`, `.next/`, `*.log`, `tmp/`. See [`data/README.md`](../data/README.md) for full inclusion/exclusion details and a known issue with large user-managed directories (media, kiwix, ollama) being included.

**Mount types:**
- Named bind mounts from host `./data/` → container paths
- Dashboard mounts `./data` as read-only (`:ro`) for metrics
- Dashboard mounts `./data/security` and `./data/backups` as read-write
- Theia mounts `/var/run/docker.sock` for container management
- OpenVPN UI mounts `/var/run/docker.sock` as read-only

---

## 7. Deployment Lifecycle

### First-Time Setup (install.sh)

```
1. chmod +x install.sh
2. ./install.sh
   ├── Auto-detects LAN IP (hostname -I / ipconfig getifaddr)
   ├── Creates .env from .env.example with secure defaults
   ├── docker compose up -d
   ├── Installs Nextcloud Hub apps (Calendar, Contacts, Office, Talk)
   ├── Configures Nextcloud Office (Collabora) via occ commands
   └── Opens browser to dashboard URL
```

### Subsequent Starts (boom.sh)

```
1. chmod +x boom.sh
2. ./boom.sh
   ├── Reads existing .env
   ├── Auto-detects LAN IP
   ├── docker compose up -d
   └── Opens browser to dashboard URL
```

### Shutdown

```
docker compose down
```

### Dashboard One-Time Setup (First Launch)

```
1. Open http://localhost:3069
2. Redirected to /setup automatically
3. Generate entropy key (mouse movement + CSPRNG)
4. Create admin account
5. Database encrypted and rekeyed
6. Redirected to dashboard
```

---

## 8. Architecture Decision Records

### ADR-0001: Use Docker Compose Over Kubernetes

**Status:** Accepted
**Date:** 2026-04-04
**Source:** Log 21 — Kubernetes vs. Docker Orchestration Audit

**Context:** HomeForge is a packaged product for end-users installing on their own servers, mini-PCs, or Raspberry Pi clusters. We evaluated K3s/K8s vs Docker Compose.

**Decision:** Retain Docker Compose as the primary orchestration engine for MVP and V1.

**Rationale:**
- Kubernetes introduces operational overhead (networking, storage, ingress) conflicting with the "simple install" goal
- Industry precedent: TrueNAS SCALE 24.10 "Electric Eel" reverted from K3s back to Docker Compose for home users
- K3s requires 5x–10x idle RAM overhead vs native Docker — detrimental to low-power hardware
- Docker Compose is pre-installed on most server distributions; K3s requires additional setup
- TrueNAS found the UI-to-K8s middleware layer was the primary source of bugs

**Consequences:**
- Simpler installation: one command (`./boom.sh`) and everything works
- Single `docker-compose.yml` users can read to understand every service
- Debug with `docker logs <name>` — no cluster knowledge required
- Upgrade by changing one image tag
- Multi-node support deferred to Phase 2 (Dokploy per Log 21)

**Future:** A `Driver` abstraction layer will be implemented so the UI talks to `OrchestrationDriver`, enabling a `KubernetesDriver` later without rewriting the dashboard.

---

### ADR-0002: Entropy-Based Authentication with HKDF Key Derivation

**Status:** Accepted
**Date:** 2026-04-10
**Source:** Log 24 — Authentication System

**Context:** Users need a single master key that encrypts their entire installation. The key must be unpredictable, never transmitted, and never stored in plaintext.

**Decision:** Mouse movement entropy + CSPRNG → SHA-512 → HKDF-SHA512 → SESSION_SECRET, WS_SECRET, DB_KEY.

**Rationale:**
- Mouse movement provides genuine entropy from user interaction
- CSPRNG (crypto.getRandomValues) seeds the pool for additional unpredictability
- SHA-512 hashes raw entropy into a uniform 128-character hex key
- HKDF-SHA512 derives three independent secrets — none can be computed from the others
- Runtime secrets are derived at startup, never written to disk or .env

**Key derivation chain:**
```
User mouse movement + CSPRNG
    │
    ▼
SHA-512 → 128-char hex entropy key
    │
    ▼
HKDF-SHA512 (with unique info strings)
    ├──→ SESSION_SECRET (iron-session cookie encryption)
    ├──→ WS_SECRET (WebSocket ticket HMAC)
    └──→ DB_KEY (SQLCipher AES-256-GCM encryption)
```

**Consequences:**
- User MUST save entropy key — it cannot be recovered if lost
- No password reset flow exists — losing the key means losing the database
- All credentials protected by Argon2id (64 MiB memory, 3 iterations)
- Session cookie is HTTP-only, signed, encrypted (iron-session v8)

---

### ADR-0003: SQLCipher for User Database Encryption at Rest

**Status:** Accepted
**Date:** 2026-04-10

**Context:** The dashboard needs a user database (accounts, sessions, roles). Must be encrypted at rest, lightweight, and work on a single node.

**Decision:** Use SQLCipher via `better-sqlite3-multiple-ciphers` for the user database.

**Rationale:**
- SQLite is zero-config, single-file, no separate database container needed
- SQLCipher adds AES-256-GCM encryption transparently
- `better-sqlite3-multiple-ciphers` provides synchronous Node.js bindings
- Pre/post-setup rekey: opens with temporary UUID key, then `PRAGMA rekey` to entropy-derived key
- Fits the single-node, low-overhead design

**Consequences:**
- Database file is unreadable without the entropy-derived DB_KEY
- No backup/restore complexity of a separate database server
- Single file makes backup trivial (copy the file)
- Limited to single-writer — acceptable for user management workload

---

### ADR-0004: Dashboard as Central Control Plane

**Status:** Accepted
**Date:** 2026-04-10

**Context:** Users need a single interface to monitor, manage, and interact with all services.

**Decision:** Build a single Next.js 16 application as the central control plane — monolithic by design.

**Rationale:**
- One codebase, one deploy, one login
- Next.js API routes handle all backend logic without a separate API service
- WebSocket server runs alongside Next.js on port 3070
- Dashboard mounts Docker socket to monitor all containers
- Dashboard mounts `./data` as read-only for metrics collection
- Fits the "one dashboard, one login" product principle

**What the dashboard does:**
- Authentication and session management (iron-session, Argon2id, SQLCipher)
- Server resource metrics (CPU, RAM, disk via Docker API)
- Service health monitoring
- WebSocket terminal access to containers
- Backup/restore orchestration
- Kiwix ZIM file management proxy
- Ollama model management proxy
- Module launching (iframe embeds for Jellyfin, Nextcloud, Element, etc.)

**Consequences:**
- Monolith is intentional — no microservice split for v0.1.0
- Dashboard is the single point of failure for auth and management
- All dashboard logic documented in `Dashboard/Dashboard1/docs/ARCHITECTURE.md` (to be created)

---

### ADR-0005: Nginx Reverse Proxy for All User-Facing Services

**Status:** Accepted — implemented PR #179
**Date:** 2026-04-10

**Context:** 15 services exposed raw ports directly to the host. No SSL, no centralized CSP headers, no unified routing. An nginx config existed in `config/nginx/nginx.conf` but was not in the compose stack.

**Decision:** Add nginx as a container in docker-compose.yml, make it the single entry point for all user-facing services. Remove direct port mappings from individual services (except OpenVPN UDP 1194).

**Rationale:**
- Centralizes SSL termination (future Let's Encrypt support)
- Single CSP header management point
- Clean URLs (e.g., `homeforge.local/media` instead of `:8096`)
- WebSocket upgrade support for dashboard terminal, Collabora, Theia, Matrix, Vaultwarden, Open-WebUI
- Industry standard for reverse proxying

**Implementation:**
- `nginx:alpine` container on frontend + backend networks
- Full proxy config for all 15 user-facing services
- 12 host port mappings consolidated on nginx: 80, 8081, 8082, 8083, 8085, 8086, 8087, 8090, 8096, 9980, 3030, 8008
- Healthcheck at `/nginx-health`
- Direct port mappings removed from all individual services
- OpenVPN UDP 1194 kept on the service (nginx cannot proxy UDP)

---

### ADR-0006: Flat Data Volume Structure Under ./data/

**Status:** Accepted (documenting current reality)
**Date:** 2026-04-10

**Context:** Each service needs persistent storage. We chose a flat `./data/<service-name>/` structure.

**Decision:** All service data lives under a single `./data/` directory on the host, with one subdirectory per service.

**Rationale:**
- Simple to understand: one directory, all your data
- Simple to back up: archive `./data/` and you have everything
- Simple to migrate: copy the directory, everything works
- No complex volume naming or Docker volume management
- Dashboard mounts `./data` read-only for metrics across all services

**Consequences:**
- All data is in one place — easy backup, easy understanding
- No separation between config, state, and user data within each service directory
- Backup system (`app/api/backup/`) depends on this structure
- Future network segmentation and access control must account for shared mount points

---

## 9. Known Issues & Technical Debt

| Issue | Severity | Notes |
|---|---|---|
| No SSL/TLS | Medium | All traffic is HTTP on LAN — nginx ready for SSL (future) |
| OpenVPN restart set to "no" | Low | Known issue on Docker Desktop for Mac (Log 25) |
| Dashboard runs as root | Medium | Required for Docker socket access |
| Theia IDE privileged mode | Low | Required for Docker-in-Docker development |

**Resolved:**
| Issue | Resolution |
|---|---|
| Nginx not in compose stack | Fixed — PR #179 |
| Flat network — no segmentation | Fixed — PR #178 |
| Database ports exposed to host | Fixed — isolated on database network (PR #178) |
| Ollama port 11434 exposed to host | Fixed — removed from host (PR #178) |
| Redundant direct ports | Fixed — all consolidated through nginx (PR #179) |

---

## 10. What Needs to Change (Future Phases)

### Phase 1 — Documentation ✅ COMPLETE
### Phase 2 — Network Segmentation ✅ COMPLETE
### Phase 3 — Reverse Proxy Integration ✅ COMPLETE

### Phase 4 — Dashboard Internal Architecture (In progress)
- `Dashboard/Dashboard1/docs/ARCHITECTURE.md` — layer diagram, auth chain, API route map, WebSocket flow, backup flow
- Entropy key derivation chain documented visually
- Inline architecture comments in key files

### Phase 5 — Data Volume Contract ✅ COMPLETE
- `data/README.md` — full data hierarchy with service ownership, mount types, backup inclusion/exclusion
- Backup contract documented (known issue: large user directories included in tar)
- Critical data paths identified
- Log 29 updated with reference to data/README.md

### Phase 6 — Validation
- Full stack rebuild
- CI verification
- Cleanup of orphaned configs

---

**Status:** Living document. Updated as architecture evolves.
**Next Update:** After Phase 4 (dashboard internal architecture) implementation.
