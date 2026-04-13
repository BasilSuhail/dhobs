# 43 — Tailscale Integration (Issue #201)

**Date:** April 13, 2026  
**Author:** Basil Suhail  
**Related Issue:** #201  
**Branch:** `feat/tailscale-integration`  
**Status:** In progress

---

## Context

HomeForge is only accessible via LAN. Users need secure remote access without opening router ports. Tailscale provides encrypted WireGuard mesh networking that works behind NAT.

**Goal:** One-click Tailscale integration so all services are accessible remotely via MagicDNS (e.g., `http://homeforge:3069`).

---

## Technical Plan

### 1. Tailscale Service in docker-compose.yml
- Add `tailscale/tailscale:latest` container
- `cap_add: net_admin, sys_module`
- Volume for persistent state (`data/tailscale/state`)
- Auth key injected via env var

### 2. Traefik Integration
- Tailscale traffic enters via same Traefik instance (ports 80/443)
- No config change needed — Traefik already listens on all interfaces
- Tailscale MagicDNS resolves `homeforge.<tailnet>.ts.net` to the node IP
- Services accessible at `http://homeforge:3069`, `http://nextcloud:8081`, etc.

### 3. Dashboard UI
- Settings tab for Tailscale
- Auth key input field
- Connection status indicator
- Display Tailscale IP

### 4. Auth Key Persistence
- Store auth key in `data/secrets/tailscale_authkey`
- Survives container restarts

---

## Acceptance Criteria
- [ ] Tailscale container connects with auth key
- [ ] Auth key persisted in `data/secrets/`
- [ ] Dashboard shows connection status + Tailscale IP
- [ ] Remote machine accesses services via Tailscale IP
- [ ] Service restarts reconnect automatically
- [ ] Works alongside Traefik without port conflicts

---

## Risks

| Risk | Mitigation |
|---|---|
| Auth key expiry | User re-enters key in dashboard; future: OAuth refresh |
| Tailscale breaks LAN access | Direct LAN IPs still work — Tailscale is additive |
| Container restart loses state | Persistent volume `data/tailscale/state` |
| Docker Desktop networking | Tailscale runs as container, not host-level daemon |
