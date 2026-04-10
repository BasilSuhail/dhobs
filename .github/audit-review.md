## Architecture Review Findings

Brutally honest assessment of the current architecture post-Phase 5. Overall: 5.5/10.

---

### What is genuinely good

| Area | Assessment |
|---|---|
| **Network segmentation** | Three tiers (frontend/backend/database). Databases isolated. Correct. |
| **Single entry point via nginx** | All 15 services proxied with WebSocket support. Correct. |
| **Entropy-based auth** | Mouse movement + CSPRNG to HKDF to three independent secrets. More secure than hardcoded .env passwords. Better than 90% of homelab projects. |
| **Documentation** | One architecture doc, 6 ADRs, dashboard internals documented, data volume contract. Ahead of most self-hosted projects. |
| **Memory limits per service** | Jellyfin 2GB, Ollama 8GB, Nextcloud 1GB. Prevents resource starvation. |

---

### What is mediocre

| Area | Problem | Fix |
|---|---|---|
| **Nginx static config** | Manually proxying 15 services with static blocks. Every new service requires editing nginx.conf. Traefik auto-discovers via Docker labels. | Migrate to Traefik or add dynamic config generation. Low priority for now - nginx works fine at 15 services. |
| **Dashboard runs as root** | Required for Docker socket + node-pty. Dashboard RCE equals root on host. | Add Docker socket proxy with restricted API access. |
| **Flat data/ in .gitignore** | The whole directory is ignored. data/README.md is the only guide for fresh clones - and it is inside an ignored directory. | Move data/README.md to docs/data-volumes.md so it is version-controlled. |
| **Backup system is too broad** | Tar excludes backups, node_modules, .git, .next, *.log, tmp - but still pulls in media, kiwix, ollama which can be gigabytes. One backup could be 50GB. | Add explicit exclude flags for media, kiwix, ollama, or switch to per-directory inclusion logic. |

---

### What is actually bad

| Area | Problem | Severity | Fix |
|---|---|---|---|
| **No SSL/TLS** | 12 nginx ports exposed on LAN in plain HTTP. Zero SSL setup in nginx config. For LAN-only this is fine until someone connects remotely. No defense in depth. | High | Add self-signed cert for LAN plus Let's Encrypt placeholder. Document SSL strategy in nginx config. |
| **No log rotation** | Jellyfin, Nextcloud, Synapse produce logs. No logging max-size/max-file in compose. Logs grow unbounded until disk fills. | High | Add logging driver json-file with max-size 10m and max-file 3 to all services. |
| **No restart limits** | restart unless-stopped on everything. A crashing service loops forever. No backoff. | Medium | Use restart on-failure:5 for services prone to config errors. Keep unless-stopped for stable services. |
| **Docker socket in 3 containers** | Dashboard, Theia, OpenVPN-UI all have full Docker socket access. Each is a full root-on-host compromise vector. Theia is privileged on top. | Critical | Implement Docker socket proxy (e.g. tecnativa/docker-socket-proxy) with restricted API access per container. |
| **No healthchecks on 7 services** | Element, Kiwix, Kiwix Manager, OpenVPN, OpenVPN-UI, Collabora, MariaDB have no or weak healthchecks. Silent crashes go unnoticed. | Medium | Add healthcheck to every service without one. |

---

### What is missing entirely

| Area | Problem | Priority |
|---|---|---|
| **No automated update strategy** | Changing image tags and docker compose up -d is the upgrade path. No version pinning discipline, no migration testing, no rollback plan. One bad image update and you are restoring from backup. | High |
| **No monitoring beyond dashboard metrics** | If the dashboard goes down, zero visibility into service health. No alerting, no external health checks. | Medium |
| **No secrets management** | .env file has 9 secrets in plaintext on disk. Docker Secrets exist (even for Compose). Runtime-derived secrets are correct, but infrastructure secrets are sitting there. | High |
| **Database network is not truly isolated** | The database network is not marked internal: true. A compromised database container can phone home to the internet. | High |

---

### Summary

| Category | Score | Notes |
|---|---|---|
| Architecture decisions | 7/10 | Correct choices: segmentation, nginx, entropy auth |
| Security | 3/10 | Root containers, no SSL, full socket access, no secrets management |
| Operational readiness | 5/10 | No log rotation, no monitoring, no update strategy |
| Documentation | 8/10 | Architecture doc, ADRs, dashboard internals, data contract |
| **Overall** | **5.5/10** | Solid foundation. Fixable gaps, not a rebuild. |

---

## Recommended Next Phases

### Phase 7 - Security Hardening
- Docker socket proxy with restricted API
- SSL/TLS for nginx (self-signed + Let's Encrypt placeholder)
- internal: true on database network
- Move data/README.md to version-controlled location
- Docker Secrets for .env values

### Phase 8 - Operational Reliability
- Log rotation on all services
- Healthcheck on every service
- Backup system: exclude large user directories (media, kiwix, ollama)
- Restart policy tuning (on-failure:5 for unstable services)

### Phase 9 - Update and Rollback Strategy
- Version pinning policy for all images
- Pre-update backup hook
- Rollback procedure documented
- Migration testing for major version bumps

---

## Market Reality Check

This is not weak architecture. It is a fragile system documented beautifully. Those are different things.

### 1. Building for 2019 in a 2026 market
CasaOS: one-click app store, file manager, dashboard in a single curl. 3 minutes to install.
Umbrel: auto-configures SSL, real app store, works on Raspberry Pi out of the box.
Cloudron: handles updates, rollbacks, backups, SSL automatically.

HomeForge: run ./boom.sh, hope Docker Desktop is running, pray no port conflicts.

### 2. Security model is "trust everyone on the LAN"
No SSL. Three containers with full Docker socket access. Dashboard runs as root. Theia is privileged: true. This is not encryption-first -- this is encryption-theater. A brilliant entropy key derivation system protects a database that lives on a system where any container compromise equals full host root. Attacker compromises Kiwix, pivots to Docker socket via shared host filesystem, owns everything.

### 3. No update story
CasaOS: automated updates with rollback.
Cloudron: snapshots before every update.
Umbrel: one-click version management.
HomeForge: change the image tag and hope. One bad Nextcloud image, one breaking MariaDB migration, manually restoring from a tar.gz that might be 50GB.

### 4. Dashboard monitors itself
If the dashboard crashes, zero visibility. No external health endpoint, no alerting, no "is my server still alive" mechanism. CasaOS has a separate system monitor. TrueNAS has SNMP and email alerts.

### 5. Nginx is a maintenance liability
15 static proxy blocks. Every new service means editing nginx.conf by hand. Traefik, Caddy, and Nginx Proxy Manager auto-discover containers via Docker labels. At 15 services this is annoying. At 25 it is unbearable.

### 6. No differentiation
What problem does HomeForge solve that CasaOS plus manual Docker Compose does not solve better? The entropy key system is genuinely clever -- but it solves a problem most homelab users do not have. The dashboard is nice -- but CasaOS has a dashboard. The documentation is excellent -- but docs do not replace functionality.

### 7. Data volume structure is a liability
Flat data/ with the entire directory .gitignored means a fresh clone gives you zero guidance except the README you put inside the ignored directory. Your own architecture works against your onboarding.

### Bottom line
Well-documented, single-node, single-user homelab orchestrator with good auth design and fragile everything-else. Docs: 8/10. Security: 3/10. Operational readiness: 5/10. Market differentiation: unclear.

### What makes this competitive
- SSL out of the box (self-signed for LAN, Let's Encrypt for domains)
- Docker socket proxy to remove root access
- Automated updates with pre-update backup and rollback
- Traefik or Caddy instead of static nginx
- External health monitoring independent of the dashboard
- A clear differentiator beyond "better docs"
