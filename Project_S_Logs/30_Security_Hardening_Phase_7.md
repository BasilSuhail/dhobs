# 30 — Security Hardening (Phase 7)

Date: 2026-04-10
Author: Author
Related Issue: #182
Branch: `phase-7/security-hardening`
PR: #183

---

## Context

Architecture review (#182) scored HomeForge at 5.5/10 overall. Security was the weakest category at 3/10. Phase 7 addresses the highest-impact, lowest-risk findings.

**What this fixes:**
- No log rotation — logs grew unbounded until disk filled
- 7 services had no healthchecks — silent crashes went unnoticed
- Database network could access the internet — compromised containers could exfiltrate data
- `data/README.md` was inside `.gitignore`'d directory — fresh clones had no data hierarchy guide

---

## Changes Made

### 1. Log Rotation (All 15 Services)

Added to every service in `docker-compose.yml`:

```yaml
logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

**Before:** No rotation. Logs grew unbounded.
**After:** Each service caps at 30MB total (3 files x 10MB). Total maximum log usage: ~450MB across all services.

### 2. Healthchecks (7 New)

| Service | Healthcheck Command | Before |
|---|---|---|
| Element | `wget --spider http://localhost:80/` | No healthcheck |
| Kiwix Reader | `wget --spider http://localhost:8080/` | No healthcheck |
| Kiwix Manager | `wget --spider http://localhost:80/` | No healthcheck |
| OpenVPN | `pgrep openvpn` | No healthcheck |
| OpenVPN UI | `wget --spider http://localhost:8080/` | No healthcheck |
| MariaDB | `mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD}` | No healthcheck |
| Postgres (Synapse) | `pg_isready -U ${MATRIX_DB_USER} -d ${MATRIX_DB_NAME}` | No healthcheck |

**Total services with healthchecks:** 15/15 (was 8/15)

### 3. Database Network Isolation

Changed:

```yaml
networks:
  database:
    driver: bridge
    internal: true
```

**Before:** Database containers could reach the internet. A compromised MariaDB or Postgres could exfiltrate data or download additional tools.
**After:** Database containers can only communicate with other containers on the same network (Nextcloud, Synapse). No internet access.

### 4. Data Volumes Documentation

Moved `data/README.md` to `docs/data-volumes.md`.

**Before:** The data hierarchy guide lived inside the `.gitignore`'d `data/` directory. Fresh clones had no visibility into the data structure without building first.
**After:** `docs/data-volumes.md` is version-controlled. Anyone who clones the repo can immediately see:
- All 12 service data directories documented
- Service ownership table
- Backup inclusion/exclusion for each directory
- Mount type reference (ro vs rw)
- Critical data paths identified
- Backup contract documentation

---

## Impact Assessment

| Metric | Before | After |
|---|---|---|
| Services with log rotation | 0/15 | 15/15 |
| Services with healthchecks | 8/15 | 15/15 |
| Database network internet access | Yes | No (internal: true) |
| Data hierarchy visibility | Only after first build | Immediately on clone |
| Max total log usage | Unbounded | ~450MB |

---

## What Was NOT Done (Deferred)

| Finding | Reason | Deferred To |
|---|---|---|
| Docker socket proxy | Requires testing, risk of breaking dashboard terminal | Phase 7 follow-up |
| SSL/TLS for nginx | Requires cert management strategy, not urgent for LAN-only | Phase 7 follow-up |
| Docker Secrets for .env | Requires Compose v2.17+, risks breaking existing users | Future |
| Traefik migration from nginx | Significant refactor, static config works at 15 services | Phase 8 |
| External health monitoring | Requires new service, adds complexity | Phase 8 |

---

## Testing

- `docker compose config --quiet` passes
- All 15 services have `logging: &default-logging` applied
- All 15 services have healthcheck defined
- Database network has `internal: true`
- `docs/data-volumes.md` exists and is readable

---

**Status:** Merged. PR #183.
