# 32 — Nginx Reverse Proxy (Phase 3)

Date: 2026-04-10
Author: Basil Suhail
Related Issue: #176
Branch: `phase-3/nginx-reverse-proxy`
PR: #179

---

## Context

All 15 services exposed raw ports directly to the host. No SSL, no centralized CSP headers, no unified routing. An nginx config existed in `config/nginx/nginx.conf` but was NOT in the compose stack — it was an orphaned file.

---

## Changes Made

### 1. Nginx Service Added to `docker-compose.yml`

```yaml
nginx:
  image: nginx:alpine
  container_name: project-s-nginx
  networks:
    - frontend
    - backend
  ports:
    - '80:80'
    - '8081:8081'
    - '8082:8082'
    - '8083:8083'
    - '8085:8085'
    - '8086:8086'
    - '8087:8087'
    - '8090:8090'
    - '8096:8096'
    - '9980:9980'
    - '3030:3030'
    - '8008:8008'
  volumes:
    - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  depends_on:
    - dashboard
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "wget", "--spider", "-q", "http://localhost/nginx-health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 10s
```

### 2. Full Nginx Config for All 15 Services

Rewrote `config/nginx/nginx.conf` with proxy blocks for every user-facing service:

| Port | Service | Notes |
|---|---|---|
| :80 | Dashboard | Primary entry point |
| :8096 | Jellyfin | CSP headers for iframe embedding |
| :8081 | Nextcloud | DAV support for sync clients |
| :9980 | Collabora | Real-time editing (no buffering) |
| :3030 | Theia IDE | WebSocket for language server |
| :8008 | Matrix Synapse | WebSocket support |
| :8082 | Element | CSP headers |
| :8083 | Vaultwarden | WebSocket notifications |
| :8085 | Open-WebUI | WebSocket streaming |
| :8087 | Kiwix Reader | |
| :8086 | Kiwix Manager | |
| :8090 | OpenVPN UI | |

### 3. WebSocket Upgrade Support

Added `map $http_upgrade $connection_upgrade` and `proxy_set_header Upgrade $http_upgrade` for 6 services: dashboard terminal, Collabora, Theia, Matrix, Vaultwarden, Open-WebUI.

### 4. Direct Ports Removed from Individual Services

Removed host port mappings from all services that nginx proxies:
- Jellyfin, Nextcloud, Collabora, Theia, Synapse, Element, Vaultwarden, Open-WebUI, Kiwix, Kiwix Manager, OpenVPN UI

**Kept:** OpenVPN UDP 1194 (nginx cannot proxy UDP).

---

## Impact

| Metric | Before | After |
|---|---|---|
| Services with direct host ports | 15 | 1 (OpenVPN UDP 1194) |
| Single entry point | No | Yes (nginx) |
| WebSocket support | Partial (only in direct access) | Centralized in nginx |
| CSP header management | Per-service | Centralized in nginx |

---

## Testing

- `docker compose config --quiet` passes
- All 15 services respond correctly through nginx
- WebSocket connections work for dashboard terminal and Matrix

---

**Status:** Merged. PR #179.
