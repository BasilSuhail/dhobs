# Architecture Overhaul — Single Source of Truth

## Problem Statement

The HomeForge architecture has grown organically across 28 implementation logs without a central architecture document. The current stack has structural gaps that will block scaling, onboarding, and production readiness:

1. **No reverse proxy in the running stack** — `config/nginx/nginx.conf` exists but the nginx container is **not** in `docker-compose.yml`. All 15 services expose raw ports directly to the host. No SSL, no unified routing, no CSP centralization.
2. **Flat network topology** — All containers share the default compose network. Databases (MariaDB, Postgres, Synapse DB), internal services (Ollama), and public-facing services (Nextcloud, Jellyfin, Matrix) are all on the same flat network with no segmentation.
3. **Dashboard is an undifferentiated monolith** — Auth, session management, encrypted SQLite, WebSocket terminal, backup system, metrics aggregation, Kiwix API, Ollama proxy — all in one Next.js app with no internal layer boundaries documented.
4. **No Architecture Decision Records** — Key decisions (Docker vs K8s, entropy-based auth, SQLCipher, HKDF key derivation) are buried in logs or discussed in conversations. New contributors (or future us) have no structured trail.
5. **Documentation is scattered** — 28 markdown files in `Project_S_Logs/`, a README, a SECURITY.md, but no **architecture document** that ties system design, data flow, security boundaries, and deployment model together.
6. **Data volume structure is ad-hoc** — `./data/` mixes config, state, and user data with no documented hierarchy. The backup system works against this loose structure but there's no contract.

---

## Goals

| Goal | Success Metric |
|---|---|
| Single architecture document | One file (`docs/ARCHITECTURE.md`) that a new dev can read and understand the entire system in 15 minutes |
| ADR trail | Every major architectural decision has a numbered record in `docs/decisions/` |
| Network segmentation | `docker-compose.yml` defines `frontend`, `backend`, `database` networks; databases are unreachable from outside the compose stack |
| Reverse proxy live | Nginx container is in compose, proxies all user-facing services, SSL-ready config structure |
| Dashboard internal map | Layer diagram showing auth → session → DB → API routes → WebSocket |
| Backup system contract | Documented data hierarchy that the backup/restore system depends on |

---

## Implementation Checklist

### Phase 1 — Documentation (Foundation)
- [ ] **1.1** Create `docs/ARCHITECTURE.md` — system overview with:
  - [ ] High-level system diagram (ASCII or Mermaid)
  - [ ] Service catalog (all 15 services, purpose, port, dependencies)
  - [ ] Network topology (current + target)
  - [ ] Data flow: user request → nginx → dashboard → service
  - [ ] Security boundaries: encryption at rest, in transit, key derivation chain
  - [ ] Deployment model: `boom.sh` → `.env` → `docker compose up`
  - [ ] Backup & restore data hierarchy
- [ ] **1.2** Create `docs/decisions/` directory with ADR template
- [ ] **1.3** Write ADR-0001: _Use Docker Compose over Kubernetes_ (from Log 21)
- [ ] **1.4** Write ADR-0002: _Entropy-based authentication with HKDF key derivation_ (from Log 24)
- [ ] **1.5** Write ADR-0003: _SQLCipher for user database encryption at rest_
- [ ] **1.6** Write ADR-0004: _Dashboard as central control plane (single Next.js monolith)_
- [ ] **1.7** Write ADR-0005: _Nginx reverse proxy for all user-facing services_
- [ ] **1.8** Write ADR-0006: _Flat data volume structure under `./data/`_
- [ ] **1.9** Update `README.md` to link to `docs/ARCHITECTURE.md` as the primary technical reference

### Phase 2 — Network Segmentation
- [ ] **2.1** Define three Docker networks in `docker-compose.yml`:
  - `frontend` — nginx, dashboard, element, openvpn-ui, kiwix-manager, open-webui
  - `backend` — jellyfin, nextcloud, collabora, theia, synapse, vaultwarden, kiwix, ollama, openvpn
  - `database` — db (MariaDB), synapse-db (Postgres)
- [ ] **2.2** Assign each service to appropriate network(s)
  - Dashboard: `frontend` + `backend` (needs to reach services for health checks)
  - Nginx: `frontend` only (proxies to dashboard)
  - Nextcloud: `backend` + `database`
  - Synapse: `backend` + `database`
  - Databases: `database` only (not reachable from frontend)
- [ ] **2.3** Remove unnecessary `ports` declarations from internal-only services (Ollama:11434, databases)
- [ ] **2.4** Verify all inter-service communication still works after segmentation

### Phase 3 — Reverse Proxy Integration
- [ ] **3.1** Add nginx service to `docker-compose.yml`
- [ ] **3.2** Update `config/nginx/nginx.conf` to cover **all** user-facing services (currently only covers 5 of 15)
- [ ] **3.3** Add WebSocket upgrade support to nginx config (needed for dashboard terminal, Matrix)
- [ ] **3.4** Add healthcheck for nginx container
- [ ] **3.5** Document SSL certificate strategy (placeholders for future Let's Encrypt / self-signed)
- [ ] **3.6** Update `boom.sh` and `install.sh` to reference nginx as the primary entry point
- [ ] **3.7** Test full stack with nginx as the single entry point

### Phase 4 — Dashboard Internal Architecture
- [ ] **4.1** Create `Dashboard/Dashboard1/docs/ARCHITECTURE.md` — internal dashboard architecture:
  - [ ] Layer diagram: middleware → auth → session → DB → API routes → WebSocket server
  - [ ] Data model: user schema, session schema, encryption key chain
  - [ ] API route map with auth requirements per route
  - [ ] WebSocket ticket flow diagram
  - [ ] Backup/restore flow
- [ ] **4.2** Document the entropy key derivation chain visually (HKDF → SESSION_SECRET, WS_SECRET, DB_KEY)
- [ ] **4.3** Add inline architecture comments to key files (`middleware.ts`, `lib/auth.ts`, `lib/session.ts`)

### Phase 5 — Data Volume Contract
- [ ] **5.1** Document the `./data/` hierarchy in `docs/ARCHITECTURE.md`:
  ```
  data/
  ├── jellyfin/        # Jellyfin config + cache
  ├── nextcloud/       # Nextcloud html + data + db
  ├── matrix/          # Synapse data + config
  ├── vaultwarden/     # Password vault data
  ├── open-webui/      # AI chat backend data
  ├── ollama/          # LLM models
  ├── kiwix/           # ZIM files + library
  ├── vpn/             # OpenVPN config + certs
  ├── workspace/       # Shared workspace (Theia)
  ├── filebrowser/     # Kiwix manager DB
  ├── security/        # Dashboard entropy DB
  └── backups/         # User-initiated backups
  ```
- [ ] **5.2** Ensure backup system (`app/api/backup/`) documents what it includes/excludes
- [ ] **5.3** Add a `data/README.md` or reference in main architecture doc

### Phase 6 — Validation & Cleanup
- [ ] **6.1** Full stack rebuild: `docker compose down && docker compose up -d`
- [ ] **6.2** Verify all services reachable through correct paths
- [ ] **6.3** Run CI: `npm test` in Dashboard, `docker compose config`
- [ ] **6.4** Remove orphaned or duplicate configs
- [ ] **6.5** Update `SECURITY.md` if network segmentation changes the attack surface

---

## Out of Scope (Future Issues)

| Item | Reason |
|---|---|
| Kubernetes migration | Documented as Phase 3 in Log 21 — not for v0.1.0 |
| SSL/TLS certificate automation | Requires domain setup, DNS, cert-manager — separate issue |
| Dashboard microservice split | Intentionally monolithic for v0.1.0 — revisit post-beta |
| Multi-node / Swarm | Phase 2 (Dokploy) per Log 21 |
| Mobile app (React Native) | Phase 1 task 43 — separate concern |

---

## Dependencies & Risks

| Risk | Mitigation |
|---|---|
| Network segmentation breaks inter-service communication | Test each service after segmentation; keep `depends_on` intact |
| Nginx config is complex for 15 services | Build incrementally; test each proxy block individually |
| Removing direct ports breaks existing user workflows | Document port changes clearly in release notes; keep optional direct-access env vars |
| ADRs become stale | ADRs are append-only; new decisions supersede old ones, never edit |

---

## Acceptance Criteria

- [ ] `docs/ARCHITECTURE.md` exists and covers: system diagram, service catalog, network topology, data flow, security model, deployment model, backup contract
- [ ] `docs/decisions/` contains at least 6 numbered ADRs
- [ ] `docker-compose.yml` defines `frontend`, `backend`, `database` networks
- [ ] Nginx container is in compose and proxies all user-facing services
- [ ] Database ports (3306, 5432) are NOT exposed to the host
- [ ] `README.md` links to architecture doc as primary technical reference
- [ ] Full stack builds and passes health checks
- [ ] Dashboard tests pass (`npm test`)

---

**Labels:** `type: architecture`, `priority: high`, `scope: project-wide`
**Assignees:** BasilSuhail, saadsh15
**Estimate:** Multi-phase — track each phase independently
