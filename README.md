# Project S

> Your personal, private, self-hosted digital hub — one dashboard, one login, zero cloud dependency.

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

### Step 1 — Generate Matrix Synapse secrets

Before starting, add the following to your `.env` file. Generate each value with:

```bash
openssl rand -hex 32
```

```env
MATRIX_REGISTRATION_SECRET=<output of openssl rand -hex 32>
MATRIX_MACAROON_SECRET_KEY=<output of openssl rand -hex 32>
MATRIX_FORM_SECRET=<output of openssl rand -hex 32>
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

The following services are currently functional and accessible via their own ports:

| Service | Description | Port |
|---|---|---|
| Main Dashboard | Project S control panel | `:3069` |
| Jellyfin | Media & entertainment server | `:8096` |
| Nextcloud | Cloud productivity & file management | `:8081` |
| Nextcloud Office (Collabora) | Document editing — auto-configured on start | `:9980` |
| Theia IDE | Integrated development environment | `:3030` |
| Matrix (Element) | Secure, encrypted communications | `:8082` |
| Vaultwarden | Enterprise-grade password management | `:8083` |
| Kiwix | Offline knowledge base | `:8087` |

---

## 🛠️ Adding New Services

To add more applications to the ecosystem:

1. **Docker** — add the service to `docker-compose.yml` and expose its host port
2. **Launcher** — add the app to the `applications` array in `welcome-section.tsx`
3. **Metrics** — add the app's metadata to the `appMeta` object in `app/page.tsx` if you want it tracked in the metrics tab
4. **Startup config** — if the service requires Nextcloud app settings (e.g. a WOPI URL), add an `occ` command to `config/nextcloud/setup-office.sh` — it runs automatically on every container start

---

## 📝 Project Documentation & Logs

| Resource | Location |
|---|---|
| Technical logs | `Project_S_Logs/` directory |
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

| Module | What it does | Powered by |
|---|---|---|
| File & productivity | Documents, calendar, contacts, email | Nextcloud |
| Media server | Stream video, music, photos | Jellyfin |
| Code environment | Browser-based IDE | Eclipse Theia |
| Communications | Self-hosted chat & messaging | Matrix Synapse |
| Password manager | Vault for all credentials | Vaultwarden |
| Automation | Workflow automation | n8n |
| Smart home | Device control & automation | Home Assistant |
| AI assistant | Local LLM chat interface | LibreChat + Ollama |
| Version control | Self-hosted Git | Gitea |
| Reverse proxy | Unified routing & SSL | Nginx |

---

## How it Works

Project S is an orchestration layer built on Docker. It pulls together best-in-class open-source tools, puts them behind a single sign-on system, and manages them through a clean dashboard.

```
Your browser
    │
    ▼
Project S Dashboard  ←── one login, one UI
    │
    ├── Nginx (reverse proxy & routing)
    ├── Nextcloud · Jellyfin · Matrix Synapse
    ├── Vaultwarden · Eclipse Theia · Gitea
    └── Home Assistant · LibreChat · n8n · ...
```

Each service runs in its own Docker container. Project S handles networking, authentication passthrough, and management so you don't have to.

---

## Security Model

Project S is built encryption-first:

- **Entropy key generation** — on first launch, mouse movement entropy is hashed via SHA-256 (Web Crypto API) to produce a unique 256-bit key
- **Argon2id hashing** — master credentials are hashed before any storage operation
- **AES-256-GCM** — all stored credentials are encrypted at rest
- **Zero plaintext on disk** — your password never touches storage unencrypted
- **RBAC** — Admin, Developer, Viewer, and Media User roles with granular permissions

---

## Security Implementation (v0.1-security)

The `security` branch introduces a full authentication and encryption stack for the dashboard:

### Authentication
- **One-time setup wizard** — first launch redirects to `/setup` where mouse movement entropy generates a 128-character hex key; admin account is created in the same flow
- **iron-session v8** — encrypted, signed HTTP-only cookie sessions (`homeforge_session`)
- **Argon2id password hashing** — 64 MiB memory, 3 iterations; credentials never stored in plaintext
- **Role-based access** — `admin` and `viewer` roles; privileged API routes protected by `requireAdmin()`
- **Middleware guard** — all dashboard routes redirect to `/login` if unauthenticated

### Database Encryption
- **SQLCipher via `better-sqlite3-multiple-ciphers`** — the SQLite database (`homeforge.db`) is AES-256 encrypted at rest
- **HKDF-SHA512 key derivation** — `SESSION_SECRET`, `WS_SECRET`, and `DB_KEY` are all derived from the entropy key; never hardcoded
- **Pre-setup / post-setup rekey** — database opens with a UUID-derived key before setup; `PRAGMA rekey` transitions it to the entropy-derived key after the wizard completes

### Rate Limiting & WebSocket Security
- **Sliding-window rate limiter** — login endpoint allows 10 attempts per username per 15 minutes; returns `X-RateLimit-*` headers
- **WS ticket auth** — terminal WebSocket connections require a short-lived HMAC-SHA256 ticket (`GET /api/auth/ws-ticket`); tickets expire after 30 seconds
- **PTY idle timeout** — terminal sessions close automatically after 30 minutes of inactivity
- **Container allowlist** — WebSocket shell access is restricted to explicitly whitelisted container names

### Secrets Management
No secrets are hardcoded. All sensitive values are environment variables documented in `.env.example`:

| Variable | Used by |
|---|---|
| `SESSION_SECRET` | iron-session cookie encryption |
| `WS_SECRET` | WebSocket HMAC ticket signing |
| `DB_KEY` | SQLCipher database encryption key |
| `MATRIX_REGISTRATION_SECRET` | Synapse federation registration |
| `MATRIX_MACAROON_SECRET_KEY` | Synapse macaroon tokens |
| `MATRIX_FORM_SECRET` | Synapse CSRF protection |

Generate Matrix secrets with: `openssl rand -hex 32`

---

## Roadmap

| Phase | Focus | Status |
|---|---|---|
| 1 | Research & open-source tool selection | Mostly complete |
| 2 | Initial setup, encryption & user management | Not started |
| 3 | Dashboard design & UI | Partially complete |
| 4 | Core service integration | Partially complete |
| 5 | Optional modules & one-click installer | Not started |
| 6 | Smart home, supply chain & public beta | Not started |

**Target release:** `v0.1.0` public beta, tagged in Gitea on completion of all 60 tasks.

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
