# 43 — Tailscale Integration (Issue #201)

**Date:** April 13, 2026  
**Author:** Basil Suhail  
**Related Issue:** #201  
**Branch:** `feat/tailscale-integration`  
**Status:** Implementation complete

---

## Context

HomeForge is only accessible via LAN. Users need secure remote access without opening router ports. Tailscale provides encrypted WireGuard mesh networking that works behind NAT.

**Why Tailscale over OpenVPN (which we already have):**
- OpenVPN: manual .ovpn files, certificate management, port forwarding
- Tailscale: one login, zero config, works behind NAT, WireGuard-based

**Philosophy:** Tailscale is optional. OpenVPN stays for open-source purists. Tailscale is for "it just works" users.

---

## Implementation

### 1. Docker Compose Service
```yaml
tailscale:
  image: tailscale/tailscale:latest
  hostname: homeforge
  cap_add: [net_admin, sys_module]
  volumes:
    - ./data/tailscale/state:/var/lib/tailscale
    - ./data/secrets/tailscale_authkey:/run/secrets/tailscale_authkey:ro
  environment:
    - TS_AUTHKEY_FILE=/run/secrets/tailscale_authkey
    - TS_EXTRA_ARGS=--accept-routes --accept-dns=false
    - TS_USERSPACE=false
```

### 2. Auth Key Management
- Auth key stored in `data/secrets/tailscale_authkey` (gitignored)
- Empty file = container runs but doesn't connect (graceful degradation)
- User runs `./scripts/setup-tailscale.sh <KEY>` to activate
- Key persists across container restarts

### 3. Setup Script
`scripts/setup-tailscale.sh`:
- Validates auth key argument
- Stores key in secrets directory
- Restarts Tailscale container
- Polls connection status until connected
- Shows Tailscale IP on success

### 4. Dashboard API
`/api/tailscale` returns:
```json
{
  "connected": true,
  "ips": ["100.x.y.z"],
  "hostname": "homeforge"
}
```

### 5. boom.sh Integration
- Auto-creates empty `tailscale_authkey` file on first run
- Shows Tailscale connection status in startup output
- Graceful if Tailscale not configured

---

## How It Works

1. User gets auth key from https://login.tailscale.com/admin/settings/keys
2. Runs `./scripts/setup-tailscale.sh tskey-auth-...`
3. Tailscale container connects to user's Tailnet
4. All services accessible via Tailscale MagicDNS:
   - `http://homeforge:3069` (Dashboard)
   - `http://nextcloud:8081`
   - `http://jellyfin:8096`
5. No port forwarding, no router config changes

---

## Acceptance Criteria
- [x] Tailscale container added to docker-compose.yml
- [x] Auth key loaded from secrets file (not hardcoded)
- [x] setup-tailscale.sh handles one-time setup
- [x] boom.sh creates empty auth key file, shows status
- [x] Dashboard API endpoint for status
- [x] .env.example has setup instructions
- [x] No keys in git (data/secrets/* gitignored)
- [x] Optional — works without Tailscale (graceful)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Auth key expiry | User re-enters key via setup script; future: OAuth refresh |
| Tailscale breaks LAN access | Direct LAN IPs still work — Tailscale is additive |
| Container restart loses state | Persistent volume `data/tailscale/state` |
| Proprietary dependency | OpenVPN remains available for open-source purists |
