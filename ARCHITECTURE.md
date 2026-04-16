# HomeForge Architecture

> Single source of truth for system architecture, service catalog, network topology, and security model.
> For dashboard internals, see [Dashboard/Dashboard1/docs/ARCHITECTURE.md](Dashboard/Dashboard1/docs/ARCHITECTURE.md).

---

## System Overview

HomeForge is a self-hosted private cloud and AI appliance running 15 Docker Compose services on a single machine. Traefik is the single ingress point — all HTTPS traffic enters at `:443` and is routed by hostname (`<service>.<LAN_IP>.nip.io`). No service is exposed directly to the internet; users access everything through Traefik or Tailscale.

The dashboard is the control plane: it handles authentication, metrics, terminal access, backup orchestration, and service health monitoring. All inter-service communication happens on internal Docker networks. Only Traefik, the dashboard, and a handful of user-facing services expose host ports — databases and internal proxies are network-isolated.

---

## Stack Diagram

```
Internet / LAN
      │ :443 HTTPS  :80 HTTP (redirect)
      ▼
  ┌─────────┐
  │ Traefik │ ← discovers services via Docker labels → [socket-proxy]
  └────┬────┘
       │ routes by hostname
       ├──→ [dashboard      :3069]  Control plane, auth, metrics, terminal
       ├──→ [jellyfin        :8096]  Media server (movies, music, photos)
       ├──→ [nextcloud         :80]  File sync + office (Collabora WOPI)
       ├──→ [collabora        :9980]  Online document editing
       ├──→ [synapse          :8008]  Matrix homeserver (federated chat)
       ├──→ [element            :80]  Matrix web client
       ├──→ [vaultwarden        :80]  Password vault
       ├──→ [open-webui        :8080]  AI chat (proxies → Ollama)
       ├──→ [theia             :3000]  Cloud IDE (VS Code-compatible)
       ├──→ [kiwix             :8080]  Offline knowledge base (ZIM files)
       ├──→ [kiwix-manager       :80]  ZIM file manager
       └──→ [openvpn-ui        :8080]  VPN management UI

Internal only (no public routing):
  [ollama           :11434]  LLM inference ← open-webui
  [db (mariadb)      :3306]  Nextcloud database ← nextcloud
  [synapse-db (pg)   :5432]  Matrix database ← synapse
  [socket-proxy      :2375]  Docker API proxy ← traefik, dashboard
  [homeforge-backup  :3070]  Backup sidecar ← dashboard
  [openvpn         :1194/udp]  VPN server
  [tailscale]                WireGuard mesh (optional remote access)
```

---

## Network Topology

Three Docker bridge networks control blast radius:

| Network | Driver | Host-Isolated | Services |
|---------|--------|---------------|---------|
| `frontend` | bridge | No | Traefik, Dashboard, Jellyfin, Nextcloud, Collabora, Synapse, Element, Open-WebUI, Theia, Kiwix-Manager, OpenVPN-UI, Tailscale, Backup |
| `backend` | bridge | No | Dashboard, Nextcloud, Collabora, Synapse, Vaultwarden, Open-WebUI, Ollama, Kiwix, OpenVPN, OpenVPN-UI, Socket-Proxy, Backup |
| `database` | bridge | **Yes** | MariaDB (Nextcloud DB), Postgres (Synapse DB), Nextcloud, Synapse, Backup |

The `database` network is `internal: true` — containers on it cannot reach the host or internet. Only app containers that need DB access join it.

---

## Service Catalog

| Service | Container | Host Port(s) | Networks | Depends On | Purpose |
|---------|-----------|-------------|----------|------------|---------|
| traefik | project-s-traefik | 80, 443, 8080 | frontend, backend | dashboard | Reverse proxy + TLS termination |
| dashboard | project-s-dashboard | 3069, 3070 | frontend, backend | jellyfin, nextcloud | Control plane, auth, metrics, terminal |
| socket-proxy | project-s-socket-proxy | — | backend | — | Docker API proxy (read-only) |
| jellyfin | project-s-jellyfin | 8096 | frontend, backend | — | Media server |
| nextcloud | project-s-nextcloud | 8081 | backend, database | db, collabora | File sync + productivity |
| collabora | project-s-collabora | 9980 | frontend, backend | — | Online office (WOPI) |
| db | project-s-nextcloud-db | — | database | — | MariaDB for Nextcloud |
| synapse | project-s-matrix-server | 8008 | frontend, backend, database | synapse-db | Matrix homeserver |
| synapse-db | project-s-matrix-db | — | database | — | Postgres for Synapse |
| element | project-s-matrix-client | 8082 | frontend | — | Matrix web client |
| vaultwarden | project-s-vaultwarden | 8083 | backend | — | Password vault |
| open-webui | project-s-open-webui | 8085 | frontend, backend | ollama | AI chat interface |
| ollama | project-s-ollama | — | backend | — | LLM inference engine |
| theia | project-s-theia | 3030 | frontend, backend | — | Cloud IDE |
| kiwix | project-s-kiwix-reader | 8087 | backend | — | Offline knowledge base |
| kiwix-manager | project-s-kiwix-manager | 8086 | frontend | — | ZIM file manager |
| openvpn | project-s-openvpn | 1194/udp | backend | — | VPN server |
| openvpn-ui | project-s-openvpn-ui | 8090 | frontend, backend | openvpn | VPN management UI |
| homeforge-backup | homeforge-backup | — | frontend, backend, database | dashboard | Backup sidecar (Restic) |
| tailscale | project-s-tailscale | — | frontend | — | WireGuard remote access |

---

## Security Model

### Entropy Key Derivation

Every HomeForge installation generates cryptographically unique secrets at first setup. No secrets are stored in `.env` or on disk.

```
User mouse movement (canvas events)
  + CSPRNG (window.crypto.getRandomValues)
  │
  ▼
SHA-512 → 128-char hex entropy key
  │
  ▼
HKDF-SHA512 (three independent derivations)
  ├──→ SESSION_SECRET   iron-session cookie encryption (AES-256-GCM)
  ├──→ WS_SECRET        WebSocket ticket HMAC-SHA256
  └──→ DB_KEY           SQLCipher database encryption (AES-256-GCM)
```

**Key properties:**
- Secrets derived at runtime, never stored
- Each installation produces unique secrets
- Compromise of one key does not reveal others (HKDF independence)

### User Database

- **Engine:** SQLCipher (AES-256-GCM encrypted SQLite)
- **Path:** `./data/security/homeforge.db`
- **Password hashing:** Argon2id (64 MiB memory, 3 iterations)
- **Session:** iron-session v8, HTTP-only cookies, 7-day TTL

### Docker Socket

Traefik and dashboard access Docker via `socket-proxy` (Tecnativa) — a read-only API proxy that prevents full root access via the raw socket. Theia IDE is the exception: it mounts the raw socket directly for full container management.

For full security documentation, see:
- [ADR-0002: Entropy Auth HKDF](docs/decisions/0002-entropy-auth-hkdf.md)
- [ADR-0003: SQLCipher User DB](docs/decisions/0003-sqlcipher-user-db.md)
- [Dashboard ARCHITECTURE.md — Authentication Chain](Dashboard/Dashboard1/docs/ARCHITECTURE.md#authentication-chain)

---

## Data Volume Contract

All persistent data lives under `./data/`. The hierarchy is flat by service:

```
data/
├── jellyfin/        Media server config + cache
├── media/           User media files (shared with Jellyfin)
├── nextcloud/       Nextcloud web root, user files, MariaDB
├── matrix/          Synapse data + Postgres database
├── vaultwarden/     Password vault SQLite + attachments
├── open-webui/      AI chat history + settings
├── ollama/          Downloaded LLM models
├── kiwix/           ZIM knowledge base files
├── vpn/             OpenVPN config, certs, PKI
├── workspace/       Shared IDE workspace (Theia + Ollama)
├── security/        Dashboard encrypted user DB
├── secrets/         Docker secrets (one file per secret)
├── backups/         Restic backup repository + archives
└── .migration-locks/ Active migration signals (touch files)
```

For full per-directory documentation including backup inclusion and ownership, see [docs/data-volumes.md](docs/data-volumes.md).

---

## Key Documents

### Architecture Decision Records

Six core decisions that shaped HomeForge's architecture:

| ADR | Decision | Log |
|-----|----------|-----|
| [ADR-0001](docs/decisions/0001-docker-compose-over-kubernetes.md) | Docker Compose over Kubernetes | Log 21 |
| [ADR-0002](docs/decisions/0002-entropy-auth-hkdf.md) | Entropy key + HKDF auth | Log 24 |
| [ADR-0003](docs/decisions/0003-sqlcipher-user-db.md) | SQLCipher for user database | Log 24 |
| [ADR-0004](docs/decisions/0004-dashboard-monolith.md) | Dashboard as monolith | Log 33 |
| [ADR-0005](docs/decisions/0005-nginx-reverse-proxy.md) | Nginx → Traefik migration | Log 42 |
| [ADR-0006](docs/decisions/0006-flat-data-volumes.md) | Flat data volume contract | Log 34 |

### Deep Dives

- [Dashboard Internal Architecture](Dashboard/Dashboard1/docs/ARCHITECTURE.md) — Next.js monolith, auth chain, API routes, WebSocket terminal
- [Data Volume Contract](docs/data-volumes.md) — Per-directory ownership, backup inclusion, size expectations
- [Implementation Logs](Project_S_Logs/) — 56 logs covering every major decision and incident
