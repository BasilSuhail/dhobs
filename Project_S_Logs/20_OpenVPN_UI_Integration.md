# Log 20 — OpenVPN UI Integration

**Date:** 2026-04-03
**Branch:** `feat/openvpn-ui-integration`
**Status:** Design approved — ready for implementation
**Proposed by:** Contributor
**Upstream repo:** https://github.com/d3vilh/openvpn-ui

---

## 1. Overview

This log covers the research, design decisions, and implementation plan for adding a self-hosted VPN manager to Project S / HomeForge. The chosen solution is **openvpn-ui** by d3vilh — a GoLang/Beego web interface for managing an OpenVPN server via Easy-RSA and the Docker socket.

**Goal:** Any HomeForge instance (single user or team) can spin up a VPN server as part of the standard `./boom.sh` startup, and manage it through a tile in the dashboard that opens a full web UI in a new tab.

---

## 2. Why openvpn-ui

| Criterion | Assessment |
|---|---|
| Self-hosted | ✅ Fully local, no cloud dependency |
| Docker-native | ✅ Two-container model, Docker socket integration |
| UI for non-technical users | ✅ Browser-based cert management, QR codes, 2FA |
| No new external dependencies | ✅ Uses Node built-ins, Easy-RSA bundled in image |
| Active maintenance | ✅ Latest release v0.9.5.6 (Dec 2024), last commit Feb 2025 |
| MVP fit | ✅ Works out of the box with minimal config |

Alternatives considered and rejected:
- **wg-easy (WireGuard):** Simpler, but requires kernel module — not always available on VPS/cloud hosts. May be added as a follow-up.
- **Raw OpenVPN + manual CLI:** No UI, defeats the purpose for HomeForge users.

---

## 3. Architecture

```
Browser → http://<host>:8090 → project-s-openvpn-ui (GoLang/Beego, port 8080 inside)
                                          │
                          ┌───────────────┴───────────────┐
                          │ shared volumes (./data/vpn/)  │
                          │ /var/run/docker.sock (r/o)    │
                          └───────────────┬───────────────┘
                                          │
                               project-s-openvpn
                               (OpenVPN daemon, port 1194 UDP)
```

**project-s-openvpn** — runs the OpenVPN daemon. Handles all VPN tunnel traffic on 1194/UDP. Manages iptables/MASQUERADE rules on the host network. Requires `privileged: true` and `cap_add: NET_ADMIN`.

**project-s-openvpn-ui** — web admin panel. Does NOT handle VPN traffic. Reads/writes PKI and config files on shared volumes. Calls the Docker socket (read-only) to restart the OpenVPN container when certs change. Requires `privileged: true` for file operations.

---

## 4. Port Allocation

| Port | Protocol | Purpose | Existing conflict? |
|---|---|---|---|
| **8090** | TCP | OpenVPN UI web interface | No — 8090 taken by Kiwix (PR #78) |
| **1194** | UDP | OpenVPN VPN tunnel traffic | No — uncontested |
| 2080 | TCP | OpenVPN management socket | Internal only, NOT exposed to host |

Existing HomeForge ports for reference: 3030, 3069, 8008, 8081–8086, 8096, 9980, 11434.

---

## 5. Docker Compose Changes

Add to `docker-compose.yml`:

```yaml
  openvpn:
    image: d3vilh/openvpn-server:latest
    container_name: project-s-openvpn
    privileged: true
    cap_add:
      - NET_ADMIN
    ports:
      - "1194:1194/udp"
    volumes:
      - ./data/vpn:/etc/openvpn
    restart: unless-stopped

  openvpn-ui:
    image: d3vilh/openvpn-ui:latest
    container_name: project-s-openvpn-ui
    privileged: true
    depends_on:
      - openvpn
    ports:
      - "8090:8080"
    environment:
      - OPENVPN_ADMIN_USERNAME=${VPN_ADMIN_USERNAME:-admin}
      - OPENVPN_ADMIN_PASSWORD=${VPN_ADMIN_PASSWORD}
    volumes:
      - ./data/vpn:/etc/openvpn
      - ./data/vpn/db:/opt/openvpn-ui/db
      - ./data/vpn/pki:/usr/share/easy-rsa/pki
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped
```

**Important:** `VPN_ADMIN_PASSWORD` must be set in `.env`. Never hardcoded. `VPN_ADMIN_USERNAME` defaults to `admin` if not set.

---

## 6. Volume Layout

All VPN state lives under `./data/vpn/`. This follows the existing HomeForge pattern (all persistent data under `./data/`).

```
./data/vpn/
├── pki/                  # PKI directory — CA, server cert, client certs, CRL, DH params, TA key
│   ├── ca.crt
│   ├── issued/
│   ├── private/
│   └── ...
├── clients/              # Generated .ovpn profile files for download
├── config/
│   ├── client.conf       # Client config template (embedded in .ovpn files)
│   └── easy-rsa.vars     # EasyRSA settings (cert validity, org fields, CRL expiry)
├── staticclients/        # CCD files for static IP assignments
├── log/                  # OpenVPN log files
├── db/                   # openvpn-ui SQLite database (UI users, settings)
├── server.conf           # OpenVPN server configuration
└── fw-rules.sh           # Firewall rules hook (can be empty on first run)
```

**⚠️ Critical:** The `pki/` directory is the entire trust anchor. Back it up. Losing it means regenerating all client certificates.

---

## 7. Seed Config Files

The openvpn-server container expects config files to exist on first boot. These should be shipped as templates in `config/vpn/` in the repo and copied to `./data/vpn/` by `boom.sh`/`install.sh` **only if not already present** (to avoid overwriting a live PKI).

Files needed in `config/vpn/`:
- `server.conf` — OpenVPN server config (protocol, subnet, DNS, cipher settings)
- `client.conf` — Client profile template
- `easy-rsa.vars` — PKI settings (key size, expiry, org name)
- `fw-rules.sh` — Firewall hook (can be empty `#!/bin/sh`)

Copy logic in `boom.sh`/`install.sh`:
```bash
# Copy VPN seed configs only if not already present (don't overwrite live PKI)
if [ ! -f ./data/vpn/server.conf ]; then
  cp -r ./config/vpn/. ./data/vpn/
  echo "VPN seed configs copied to ./data/vpn/"
fi
```

---

## 8. boom.sh / install.sh Changes

Two additions to both scripts:

### a) Directory creation (with existing filebrowser pattern)
```bash
mkdir -p ./data/vpn/{pki,clients,config,staticclients,log,db}
```

### b) Seed config copy (conditional, after mkdir)
```bash
if [ ! -f ./data/vpn/server.conf ]; then
  cp -r ./config/vpn/. ./data/vpn/
  echo "VPN seed configs copied to ./data/vpn/"
fi
```

---

## 9. .env / .env.example Changes

Add to `.env.example`:
```env
# OpenVPN UI
VPN_ADMIN_USERNAME=admin
VPN_ADMIN_PASSWORD=change_me_vpn_password
```

The `install.sh` already warns users to edit `.env` before first run — no additional prompting needed.

---

## 10. Dashboard Tile

In `Dashboard/Dashboard1/components/dashboard/welcome-section.tsx`, add to the `SERVICE_PORTS` array:

```typescript
import { Shield } from "lucide-react"  // add to existing import

{ name: "VPN Manager", port: 8090, icon: Shield },
```

This gives the VPN a tile identical in behaviour to Jellyfin, Nextcloud, etc. — click opens `http://${hostname}:8090` in a new tab.

---

## 11. First-Run Flow (Post-Install)

After `./boom.sh` or `./install.sh` runs for the first time with VPN enabled:

1. Containers start. openvpn-ui initialises the SQLite DB.
2. Open `http://<host>:8090` — log in with `VPN_ADMIN_USERNAME` / `VPN_ADMIN_PASSWORD`.
3. Navigate to **EasyRSA** → **Init PKI** → **Build CA** → **Generate DH params** → **Generate TA key**.
4. Create a server certificate: **Certificates** → **New server cert**.
5. Restart the openvpn container from the UI: **Server** → **Restart**.
6. Create your first client certificate: **Certificates** → **New client cert**.
7. Download the `.ovpn` profile file and import it into your OpenVPN client.

For external (internet) access: forward port **1194 UDP** on your router to the HomeForge host IP.

---

## 12. Known Limitations (MVP scope — not blocking)

| Limitation | Detail | Future fix |
|---|---|---|
| No built-in HTTPS | UI serves plain HTTP on 8090 | Add reverse proxy (Nginx/Caddy) with TLS |
| No subpath support | Cannot be served at `/vpn`, must use port or subdomain | Upstream issue #151 — track for fix |
| Privileged containers | Both containers run `privileged: true` | Accepted for OpenVPN — iptables required |
| Docker socket in UI | UI can inspect/control all host containers | Read-only mount mitigates; LAN-only for MVP |
| External access needs port-forward | Router config required for remote VPN access | Document as post-install step |
| Tab switching iframe reload | Known UX issue if embedded later | Future UX improvement |

---

## 13. Files Changed (Implementation Checklist)

- [ ] `docker-compose.yml` — add `openvpn` and `openvpn-ui` services
- [ ] `boom.sh` — add `mkdir -p ./data/vpn/{...}` + seed config copy
- [ ] `install.sh` — same as boom.sh
- [ ] `.env.example` — add `VPN_ADMIN_USERNAME`, `VPN_ADMIN_PASSWORD`
- [ ] `config/vpn/server.conf` — seed server config template
- [ ] `config/vpn/client.conf` — seed client config template
- [ ] `config/vpn/easy-rsa.vars` — seed EasyRSA vars template
- [ ] `config/vpn/fw-rules.sh` — empty firewall hook script
- [ ] `Dashboard/Dashboard1/components/dashboard/welcome-section.tsx` — add VPN tile to `SERVICE_PORTS`

---

## 14. References

- openvpn-ui repo: https://github.com/d3vilh/openvpn-ui
- openvpn-server repo: https://github.com/d3vilh/openvpn-server
- openvpn-ui Docker Hub: https://hub.docker.com/r/d3vilh/openvpn-ui
- Related issue: (GitHub issue to be linked)
