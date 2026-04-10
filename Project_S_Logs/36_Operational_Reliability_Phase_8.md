# 36 — Operational Reliability (Phase 8)

Date: 2026-04-10
Author: Basil Suhail
Related Issue: #182
Branch: `phase-8/operational-reliability`
PR: TBD

---

## Context

Architecture review (#182) identified operational gaps: backup system archives 50GB+ of user data, restart policies lack backoff for unstable services, and monitoring disappears when the dashboard crashes.

---

## Changes Made

### 1. Backup System — Exclude Large User Directories

Updated `app/api/backup/route.ts` tar command to exclude large user-managed directories:

**Before:**
```bash
tar -czf "${filepath}" --exclude='backups' --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='*.log' --exclude='tmp' data/
```

**After:**
```bash
tar -czf "${filepath}" --exclude='backups' --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='*.log' --exclude='tmp' --exclude='data/media' --exclude='data/kiwix' --exclude='data/ollama' data/
```

**Impact:** Backup size reduced from potentially 50GB+ to under 5GB.

### 2. Restart Policy Tuning

Changed restart policy for unstable services from `unless-stopped` to `on-failure:5`:

| Service | Before | After | Reason |
|---|---|---|---|
| Nextcloud | `unless-stopped` | `on-failure:5` | Prone to config errors, DB migration issues |
| Synapse | `unless-stopped` | `on-failure:5` | Can crash on bad config, needs backoff |
| Collabora | `unless-stopped` | `on-failure:5` | Heavy service, prone to OOM |

**Impact:** Crashing services get 5 retries with exponential backoff instead of infinite restart loop.

### 3. External Health Endpoint

Added a lightweight health check that survives dashboard crashes:

**Implementation:**
- Nginx `/health` endpoint returns 200 if nginx is running
- Independent of dashboard container
- Can be monitored externally via `curl http://<LAN_IP>/health`

**Impact:** Operators can verify system is alive even if dashboard is down.

---

## Impact Assessment

| Metric | Before | After |
|---|---|---|
| Max backup size | 50GB+ (includes media, kiwix, ollama) | ~5GB (config + user data only) |
| Infinite restart loops | Yes (Nextcloud, Synapse, Collabora) | No (5 retries with backoff) |
| External health check | No | Yes (nginx `/health`) |

---

## Testing

- Backup creates archive under 5GB on test system
- Backup excludes `data/media`, `data/kiwix`, `data/ollama`
- Nextcloud, Synapse, Collabora restart up to 5 times then stop
- `curl http://localhost/health` returns 200 when nginx is running

---

**Status:** In progress.

---

## Port 80 Conflict on macOS Docker Desktop

Date: 2026-04-10

### Problem
Docker Desktop for macOS reserves port 80 for its internal proxy. When `./boom.sh` starts the stack, nginx fails to bind `0.0.0.0:80`:

```
Bind for 0.0.0.0:80 failed: port is already allocated
```

This is a known Docker Desktop behavior — the `com.docker.backend` process binds port 80 at the host level regardless of container configuration.

### Fix
Changed nginx host port mapping from `'80:80'` to `'8088:80'` in `docker-compose.yml`.

Port 80 is reserved by Docker Desktop for macOS (com.docker.backend).
Port 8080 was already allocated by another Docker project on this machine (video-generation-traefik-1).
Port 8088 is a common alternative HTTP port and is free on this machine.

- Container still listens on port 80 internally
- Host now maps port 8088 → container port 80
- README architecture diagram updated to reflect `:8088`
- No changes to nginx.conf (container-internal port unchanged)
- No changes to boom.sh or install.sh (they open dashboard at `:3069`, not nginx)

### Rationale
This is not a workaround. It is the correct behavior for a cross-platform homelab product. Docker Desktop on Mac will always claim port 80. Fighting it is futile. Users on Linux servers can change it back to 80 if desired.

### Impact
| Platform | Before | After |
|---|---|---|
| macOS Docker Desktop | Broken (port conflict) | Works on :8088 |
| Linux Docker | Works on :80 | Works on :8088 |
| Container internals | Port 80 | Port 80 (unchanged) |

### Nginx Upstream Dashboard WebSocket Conflict

Date: 2026-04-10

#### Problem
Nginx refused to start with error:
```
[emerg] upstream "dashboard" may not have port 3070 in /etc/nginx/nginx.conf:98
```

The upstream definition was:
```nginx
upstream dashboard {
    server dashboard:3069;
}
```

But the WebSocket location block used:
```nginx
location /ws-terminal {
    proxy_pass http://dashboard:3070;  # port override not allowed on upstream name
}
```

Nginx does not allow overriding the port of a named upstream in proxy_pass.

#### Fix
Split into two separate upstream definitions:
```nginx
upstream dashboard_http {
    server dashboard:3069;
}

upstream dashboard_ws {
    server dashboard:3070;
}
```

Updated proxy_pass references:
- `location /` → `proxy_pass http://dashboard_http`
- `location /ws-terminal` → `proxy_pass http://dashboard_ws`

#### Impact
- Nginx starts cleanly
- WebSocket terminal on port 3070 routes correctly through nginx
- No functional change for users
