# Project S

> Your personal, private, self-hosted digital hub — one dashboard, one login, zero cloud dependency.

**[Live Preview →](https://basilsuhail.github.io/ProjectS-HomeForge)**

---

**GitHub Repo:** [homelab-os-landing →](https://github.com/BasilSuhail/homelab-os-landing)

---

## Table of Contents

**Getting Started**
- [Quick Start](#-quick-start)
- [First-Time Security Setup](#-first-time-security-setup)
- [Integrated Services](#-integrated-services)
- [Adding New Services](#-adding-new-services)
- [Project Logs](#-project-documentation--logs)
- [Contributors](#contributors)

**Project Overview**
- [Architecture](Project_S_Logs/29_Architecture_Overhaul.md)
- [What is it?](#what-is-it)
- [Core Features](#core-features)
- [How it Works](#how-it-works)
- [Security Model](#security-model)
- [Roadmap](#roadmap)
- [Licensing](#licensing)
- [Team](#team)

---
---

# Getting Started

*A collaborative project building a unified, self-hosted digital hub platform.*

This repository contains the implementation plan, product definition, technical feasibility analysis, and documentation for Project S — a self-hosted operating system for the home server that integrates the best open-source tools into a single, easy-to-manage interface.

---

## 🚀 Quick Start

To start the entire Project S ecosystem with a single command, use the `boom.sh` script (recommended for Mac) or the specialised installation scripts below.

**Option A: The "Boom" Script (Mac / Local)**

```bash
chmod +x boom.sh
./boom.sh
```

Creates `.env` automatically, detects your LAN IP, builds, starts all services, and launches your browser. Use this for day-to-day restarts.

To stop all services:

```bash
docker compose down
```

**Option B: The "Install" Script (Linux / First-Time Setup)**

```bash
chmod +x install.sh
./install.sh
```

Creates `.env` automatically, detects your LAN IP, starts all containers, installs Nextcloud Hub apps (Calendar, Contacts, Office, Talk), and configures Nextcloud Office (Collabora). Run this once on a fresh clone.

> Nextcloud Office is auto-configured on every subsequent container start via `config/nextcloud/setup-office.sh`. No manual steps needed after the first install.

**Option C: Manual Docker Setup**

```bash
cp .env.example .env
# Open .env and fill in your passwords, then:
docker compose up -d
```

> `boom.sh` and `install.sh` handle `.env` creation automatically. Only use this option if running `docker compose` directly.

---

## 🔐 First-Time Security Setup

After the containers are running, the dashboard requires a one-time setup before it can be used.

### Step 1 — Matrix Synapse secrets

`boom.sh` and `install.sh` auto-generate these on first run. If you're using **Option C (manual `docker compose`)**, add them to `.env` manually:

```bash
openssl rand -hex 32   # run three times — one value per variable
```

```env
MATRIX_REGISTRATION_SECRET=<generated>
MATRIX_MACAROON_SECRET_KEY=<generated>
MATRIX_FORM_SECRET=<generated>
```

These are injected into `config/matrix/homeserver.yaml` at container startup. Never reuse values between installations.

### Step 2 — Dashboard entropy key & admin account

1. Open `http://localhost:3069` — you will be redirected to `/setup` automatically
2. Move your mouse over the canvas to generate a unique 128-character encryption key
3. **Copy and store this key somewhere safe** — it encrypts your entire database; it cannot be recovered if lost
4. Choose a username and a strong password (minimum 12 characters) to create your admin account
5. You will be logged in automatically and redirected to the dashboard

> The entropy key is derived from mouse movement + CSPRNG (SHA-512). It is stored AES-256-GCM encrypted on disk and used to derive the database encryption key, session secret, and WebSocket secret via HKDF-SHA512. It never leaves the server.

### Step 3 — Subsequent logins

Navigate to `http://localhost:3069` and log in with the admin credentials created in Step 2. Additional user accounts (with `viewer` role) can be created from the dashboard admin panel.

---

## 📦 Integrated Services

The following services are currently running and accessible via their own ports:

| Service | Description | Port |
|---|---|---|
| Main Dashboard | Project S control panel | `:3069` |
| Jellyfin | Media & entertainment server | `:8096` |
| Nextcloud | Cloud productivity & file management | `:8081` |
| Nextcloud Office (Collabora) | Document editing — auto-configured on start | `:9980` |
| Theia IDE | Browser-based IDE with terminal & Docker access | `:3030` |
| Matrix / Element | Secure, encrypted self-hosted chat | `:8082` |
| Vaultwarden | Password manager (Bitwarden-compatible) | `:8083` |
| Open-WebUI | Local AI chat interface (connected to Ollama) | `:8085` |
| Kiwix Manager | File browser for uploading `.zim` files | `:8086` |
| Kiwix Reader | Offline knowledge base (Wikipedia, etc.) | `:8087` |
| OpenVPN UI | VPN client management interface | `:8090` |
| Ollama | Local LLM inference engine | `:11434` |
| OpenVPN Server | Self-hosted VPN | `:1194/udp` |

---

## 🛠️ Adding New Services

To add more applications to the ecosystem:

1. **Docker** — add the service to `docker-compose.yml` and expose its host port
2. **Launcher** — add the app to the `applications` array in `welcome-section.tsx`
3. **Metrics** — add the app's metadata to the `appMeta` object in `app/page.tsx` if you want it tracked in the metrics tab
4. **Startup config** — if the service requires Nextcloud app settings (e.g. a WOPI URL), add an `occ` command to `config/nextcloud/setup-office.sh` — it runs automatically on every container start

---

## 📝 Project Documentation & Logs

**Architecture** — Start here to understand the entire system:
- [Architecture Overhaul](Project_S_Logs/29_Architecture_Overhaul.md) — system diagram, service catalog, network topology, security model, deployment lifecycle
- [Architecture Decision Records](docs/decisions/) — numbered records for every major architectural decision

**Implementation Logs:**

| Resource | Location |
|---|---|
| Technical logs (01–28) | `Project_S_Logs/` directory |
| Static UI preview | `Project_S_Logs/06_Dashboard_Technical_Report.html` |

Open the HTML file in any browser for a functional, high-fidelity mirror of the dashboard frontend.

---

## Contributors

- **BasilSuhail**
- **saadsh15**

---
---

# Project Overview

---

## What is it?

Project S replaces expensive, data-harvesting cloud subscriptions (Google Drive, Office 365, Netflix, 1Password...) with self-hosted, open-source alternatives running on hardware you own — a Raspberry Pi, an old PC, or a VPS.

Install once. Get a private, encrypted, modular platform that runs your digital life.

**Core principles:**
- **Unified** — one login, one dashboard, one update system
- **Private** — encryption keys you control, nothing leaves your network
- **Modular** — install only what you need, add more later
- **Simple** — no command line required for day-to-day use

---

## Core Features

**Currently implemented:**

| Module | What it does | Powered by |
|---|---|---|
| File & productivity | Documents, calendar, contacts, email | Nextcloud + Collabora |
| Media server | Stream video, music, photos | Jellyfin |
| Code environment | Browser-based IDE with terminal | Eclipse Theia |
| Communications | Self-hosted encrypted chat | Matrix Synapse + Element |
| Password manager | Vault for all credentials | Vaultwarden |
| AI assistant | Local LLM chat interface | Open-WebUI + Ollama |
| Offline knowledge | Wikipedia & more, no internet required | Kiwix |
| VPN | Self-hosted private network | OpenVPN |

**Planned modules:**

| Module | Powered by |
|---|---|
| Workflow automation | n8n |
| Smart home | Home Assistant |
| Version control | Gitea |
| Reverse proxy & SSL | Nginx |

---

## How it Works

HomeForge is an orchestration layer built on Docker. It pulls together best-in-class open-source tools, puts them behind a unified dashboard, and manages them through a single interface.

### System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         User's Browser                            │
│                     http://<LAN_IP>:<port>                         │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Nginx Reverse Proxy                          │
│              (:80 :8081 :8082 :8083 :8085 :8087 :8090)           │
│              (:8096 :9980 :3030 :8008 :8086)                      │
└──┬────────────┬──────────────┬──────────────┬───────────────────┘
   │            │              │              │
   ▼            ▼              ▼              ▼
┌────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐
│Dashboard│  │ Jellyfin │  │Nextcloud │  │ Vaultwarden│
│:3069    │  │  :8096   │  │  :8081   │  │   :8083   │
│:3070 WS │  │          │  │+Collabora│  │           │
└────┬────┘  └──────────┘  │  :9980   │  └───────────┘
     │                     └────┬─────┘
     │                          │
     ▼                          ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐
│Open-WebUI│  │ Element  │  │OpenVPN UI│  │ Kiwix     │
│  :8085   │  │  :8082   │  │  :8090   │  │  :8087    │
└────┬─────┘  └──────────┘  └──────────┘  └───────────┘
     │
     ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐
│  Ollama  │  │  Theia   │  │  Synapse │  │ OpenVPN   │
│(internal)│  │  :3030   │  │  :8008   │  │ :1194/udp │
└──────────┘  └──────────┘  └────┬─────┘  └───────────┘
                                 │
                    ┌────────────┴────────────┐
                    │    Database Network     │
                    │  MariaDB · Postgres     │
                    │  (internal only)        │
                    └─────────────────────────┘
```

### Network Topology

| Network | Services |
|---|---|
| **frontend** | nginx, dashboard, element, openvpn-ui, kiwix-manager, open-webui |
| **backend** | jellyfin, nextcloud, collabora, theia, synapse, vaultwarden, kiwix, ollama, openvpn |
| **database** | MariaDB (Nextcloud), Postgres (Synapse) — internal only |

Each service runs in its own Docker container. Project S handles networking, shared data volumes, and service health monitoring so you don't have to.

---

## Security Model

Project S is built encryption-first. The dashboard uses a layered security stack:

### Authentication
- **One-time setup wizard** — first launch redirects to `/setup` where mouse movement entropy generates a 128-character hex key; admin account is created in the same flow
- **iron-session v8** — encrypted, signed HTTP-only cookie sessions (`homeforge_session`)
- **Argon2id password hashing** — 64 MiB memory, 3 iterations; credentials never stored in plaintext
- **Role-based access** — `admin` and `viewer` roles; privileged API routes protected by `requireAdmin()`
- **Middleware guard** — all dashboard routes redirect to `/login` if unauthenticated

### Encryption & Key Derivation
- **Entropy key** — mouse movement combined with CSPRNG, hashed via SHA-512 (Web Crypto API), produces a 128-character hex key
- **HKDF-SHA512** — `SESSION_SECRET`, `WS_SECRET`, and `DB_KEY` are all derived from the entropy key at runtime; never hardcoded or stored in `.env`
- **SQLCipher via `better-sqlite3-multiple-ciphers`** — the SQLite user database is AES-256-GCM encrypted at rest
- **Pre/post-setup rekey** — database opens with a temporary UUID-derived key before setup; `PRAGMA rekey` transitions to the entropy-derived key once setup completes

### Rate Limiting & WebSocket Security
- **Sliding-window rate limiter** — login endpoint allows 10 attempts per username per 15 minutes; returns `X-RateLimit-*` headers
- **WS ticket auth** — terminal WebSocket connections require a short-lived HMAC-SHA256 ticket (`GET /api/auth/ws-ticket`); tickets expire after 30 seconds
- **PTY idle timeout** — terminal sessions auto-close after 30 minutes of inactivity
- **Container allowlist** — WebSocket shell access is restricted to explicitly whitelisted container names

### Secrets Management
Runtime secrets (`SESSION_SECRET`, `WS_SECRET`, `DB_KEY`) are derived from the entropy key at startup — they are never written to disk or `.env`. Infrastructure secrets in `.env.example`:

| Variable | Used by |
|---|---|
| `MYSQL_ROOT_PASSWORD` / `MYSQL_PASSWORD` | Nextcloud MariaDB |
| `NEXTCLOUD_ADMIN_PASSWORD` | Nextcloud admin account |
| `COLLABORA_PASSWORD` | Collabora Online admin |
| `MATRIX_REGISTRATION_SECRET` | Synapse federation registration |
| `MATRIX_MACAROON_SECRET_KEY` | Synapse macaroon tokens |
| `MATRIX_FORM_SECRET` | Synapse CSRF protection |
| `WEBUI_SECRET_KEY` | Open-WebUI session signing |
| `VPN_ADMIN_PASSWORD` | OpenVPN UI admin account |

Generate secrets with: `openssl rand -hex 32` (or `-base64 32` for `WEBUI_SECRET_KEY`)

---

## Roadmap

| Phase | Focus | Status |
|---|---|---|
| 1 | Research & open-source tool selection | Complete |
| 2 | Authentication, encryption & user management | Complete |
| 3 | Dashboard design & UI | Partially complete |
| 4 | Core service integration | Partially complete |
| 5 | Optional modules & one-click installer | Not started |
| 6 | Smart home, automation & public beta | Not started |

**Target release:** `v0.1.0` public beta on completion of all planned tasks.

---

## Licensing

| Layer | Licence |
|---|---|
| Core orchestrator | FSL-1.1 / Apache 2.0 |
| Basic app store & UI | Free |
| Premium integrations | Paid tier |

GPL/AGPL tools (ERPNext, Kiwix, n8n) are available as optional user-deployed modules — not bundled into the core — to respect their licence terms. The paid tier funds ongoing maintenance of complex upstream integrations.

---

## Team

**Saad Shafique** — Co-founder & Developer

**Basil Suhail** — Co-founder & Developer

---

*Project S is pre-release software. No public installation is available yet. Watch this repo for the v0.1.0 beta announcement.*
