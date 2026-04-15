# 42 — Traefik Migration (Issue #202)

**Date:** April 12, 2026  
**Author:** Author  
**Related Issue:** #202  
**Branch:** `feat/traefik-migration`  
**Status:** Awaiting user testing

---

## Context

HomeForge used a manually-configured `nginx.conf` with 500+ lines of static proxy rules for 15 services.

**Problem:** Adding/removing services required editing `nginx.conf` by hand. This caused the Collabora crash (#197) and is a maintenance liability.

**Goal:** Replace nginx with Traefik — a modern reverse proxy that auto-discovers containers via Docker API labels. Zero-config routing.

---

## Changes Made

### 1. Removed Nginx
- Deleted `nginx` service from `docker-compose.yml`
- Nginx config (`config/nginx/nginx.conf`) preserved in git for rollback
- All port mappings (8081-8096, 443, etc.) removed from nginx

### 2. Added Traefik Service
```yaml
traefik:
  image: traefik:v3.2
  ports:
    - '80:80'      # HTTP → HTTPS redirect
    - '443:443'    # HTTPS for all services
    - '8080:8080'  # Traefik dashboard (debug)
  volumes:
    - socket-data:/var/run/docker.sock:ro  # Uses socket proxy
    - ./config/traefik/traefik.yml:/etc/traefik/traefik.yml:ro
    - ./config/traefik/acme.json:/acme.json
    - ./config/traefik/dynamic:/etc/traefik/dynamic:ro
```

### 3. Traefik Configuration
- **`config/traefik/traefik.yml`**: Static config — Docker provider, HTTP→HTTPS redirect, JSON logging
- **`config/traefik/dynamic/middlewares.yml`**: Dynamic config — security headers, compression
- **`config/traefik/acme.json`**: Empty cert store (will auto-generate self-signed on first run)

### 4. Service Labels (15 services routed)

| Service | URL | Port |
|---|---|---|
| Dashboard | `dashboard.<LAN-IP>.nip.io` | 3069 |
| Dashboard WS | `dashboard.<LAN-IP>.nip.io/ws-terminal` | 3070 |
| Jellyfin | `jellyfin.<LAN-IP>.nip.io` | 8096 |
| Nextcloud | `nextcloud.<LAN-IP>.nip.io` | 80 |
| Collabora | `collabora.<LAN-IP>.nip.io` | 9980 |
| Theia | `theia.<LAN-IP>.nip.io` | 3000 |
| Synapse | `synapse.<LAN-IP>.nip.io` | 8008 |
| Element | `element.<LAN-IP>.nip.io` | 80 |
| Vaultwarden | `vaultwarden.<LAN-IP>.nip.io` | 80 + WS 3012 |
| Open-WebUI | `webui.<LAN-IP>.nip.io` | 8080 |
| Kiwix | `kiwix.<LAN-IP>.nip.io` | 8080 |
| Kiwix Manager | `kiwix-manager.<LAN-IP>.nip.io` | 80 |
| OpenVPN UI | `openvpn.<LAN-IP>.nip.io` | 8080 |
| Traefik Dashboard | `traefik.<LAN-IP>.nip.io` | 8080 |

**Note:** Using `nip.io` wildcards for DNS — no local DNS server needed. `192.168.1.100.nip.io` resolves to `192.168.1.100`.

### 5. Network Changes
- **Jellyfin**: Added `frontend` network (was `backend` only)
- **Synapse**: Added `frontend` network (was `backend` + `database`)
- All other routed services already on `frontend`

### 6. Updated `boom.sh`
- Added port 443 conflict check (Traefik needs it)

### 7. Rollback Script
- Created `scripts/rollback-traefik.sh`
- Restores nginx from git, stops traefik, restarts compose

---

## Testing Checklist

- [ ] `docker compose up -d` starts without errors
- [ ] Traefik container is healthy
- [ ] Dashboard accessible at `https://dashboard.<LAN-IP>.nip.io`
- [ ] All 14 services accessible via their `.<LAN-IP>.nip.io` URLs
- [ ] HTTP → HTTPS redirect works
- [ ] WebSocket works (Dashboard terminal, Vaultwarden notifications)
- [ ] Nextcloud Office (Collabora) still works
- [ ] Rollback script tested: `./scripts/rollback-traefik.sh`

---

## Migration Path

### For Existing Users
1. Stop current stack: `docker compose down`
2. Pull branch: `git pull`
3. Create Traefik config: files already in `config/traefik/`
4. Start: `./boom.sh` or `docker compose up -d`
5. Access services via `https://<service>.<LAN-IP>.nip.io`

### Port Changes
| Old (Nginx) | New (Traefik) |
|---|---|
| `:8081` → Nextcloud | `https://nextcloud.<IP>.nip.io` |
| `:8082` → Element | `https://element.<IP>.nip.io` |
| `:8083` → Vaultwarden | `https://vaultwarden.<IP>.nip.io` |
| `:8085` → Open-WebUI | `https://webui.<IP>.nip.io` |
| `:8086` → Kiwix Manager | `https://kiwix-manager.<IP>.nip.io` |
| `:8087` → Kiwix | `https://kiwix.<IP>.nip.io` |
| `:8090` → OpenVPN UI | `https://openvpn.<IP>.nip.io` |
| `:8096` → Jellyfin | `https://jellyfin.<IP>.nip.io` |
| `:9980` → Collabora | `https://collabora.<IP>.nip.io` |
| `:3030` → Theia | `https://theia.<IP>.nip.io` |
| `:8008` → Synapse | `https://synapse.<IP>.nip.io` |

Dashboard stays at `:3069` (direct port for initial access).

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Downtime during migration | Rollback script restores nginx in <30s |
| Self-signed cert warnings | Harmless; Tailscale encryptes remote traffic |
| WebSocket routing | Each WS service has separate router label |
| Service discovery failure | Traefik watches Docker API — auto-recover on restart |
| Port 443 conflict | `boom.sh` checks for conflicts before starting |

---

## Future Work

1. **Let's Encrypt**: For users with public domains
2. **Middleware chain**: Add rate limiting, auth middleware for sensitive services
3. **Dashboard integration**: Show Traefik status + routing table in UI
