# Project S

> Your personal, private, self-hosted digital hub — one dashboard, one login, zero cloud dependency.

---

## Table of Contents

**Getting Started**
- [Quick Start](#-quick-start)
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
cp .env.example .env
chmod +x boom.sh
./boom.sh
```

Cleans up, builds, starts all services, and launches your browser. Use this for day-to-day restarts.

To stop all services:

```bash
docker compose down
```

**Option B: The "Install" Script (Linux / First-Time Setup)**

```bash
cp .env.example .env
chmod +x install.sh
./install.sh
```

Creates data directories, starts all containers, installs Nextcloud Hub apps (Calendar, Contacts, Office, Talk), and configures Nextcloud Office (Collabora). Run this once on a fresh clone.

> Nextcloud Office is auto-configured on every subsequent container start via `config/nextcloud/setup-office.sh`. No manual steps needed after the first install.

**Option C: Manual Docker Setup**

```bash
cp .env.example .env
# Open .env and fill in your passwords, then:
docker compose up -d
```

> `boom.sh` and `install.sh` handle `.env` creation automatically. Only use this option if running `docker compose` directly.

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
| Kiwix | Offline knowledge base | `:8084` |

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
