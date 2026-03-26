# Project S — File Structure & Repository Map

This document provides a comprehensive overview of the Project S directory structure, detailing the purpose of key files and folders for developers and maintainers.

---

## 1. Root Directory Structure

```text
ProjectS-HomeForge-main/
├── docker-compose.yml       # Primary orchestration for core services
├── Dockerfile.dind          # Definition for the Master DinD container
├── run-dind.sh              # Entry point script to launch the environment
├── ProjectS_Implementation_Plan.md  # Original project roadmap and goals
├── README.md                # Quick-start guide and project overview
├── .dockerignore            # Files excluded from Docker builds
├── .gitignore               # Files excluded from Git version control
│
├── Dashboard/               # The central management UI
│   └── Dashboard1/          # Next.js 16 + React 19 application source
│
├── Project_S_Logs/          # Documentation, decision logs, and audit reports
│
├── data/                    # Persistent application data (Nextcloud, Jellyfin)
├── config/                  # Configuration files for integrated services
├── cache/                   # Temporary cache files for media and web assets
├── db/                      # MariaDB/PostgreSQL database storage
└── dind-data/               # Persistent storage for internal DinD containers
```

---

## 2. Component Breakdowns

### 2.1 Dashboard (`Dashboard/Dashboard1/`)
The dashboard is a modern web application built with the following internal structure:
- **`app/`**: Next.js App Router files (`layout.tsx`, `page.tsx`, `globals.css`).
- **`components/`**:
    - **`dashboard/`**: Feature-specific sections (Media, Nextcloud, Storage, Terminal).
    - **`ui/`**: 60+ shadcn/ui primitives (buttons, cards, dialogs).
- **`hooks/`**: Custom React hooks (e.g., `use-mobile`, `use-toast`).
- **`lib/`**: Utility functions and Tailwind merging helpers (`utils.ts`).
- **`public/`**: Static assets (logos, icons, placeholders).

### 2.2 Orchestration (`/`)
- **`docker-compose.yml`**: Defines the `dashboard`, `jellyfin`, `nextcloud`, and `db` services.
- **`Dockerfile.dind`**: Creates a nested Docker environment to isolate user-deployed apps from the host.

### 2.3 Documentation (`Project_S_Logs/`)
A living history of the project, including:
- **01-05**: Design principles, roadmap, and design system.
- **06-07**: Technical reports and infrastructure audits.
- **08-13**: Implementation logs for Docker, Jellyfin, Nextcloud, Storage, and File Structure.

---

## 3. Data Persistence Architecture
Project S uses a hierarchical volume mapping strategy:
- **Host System** ──► **`dind-data/`** ──► **Internal DinD Environment**
- Internal services map their `/config` and `/data` folders to the host's `./data` and `./config` directories to ensure that all user settings and media libraries survive container updates and re-deployments.

---

## 4. Credits & Licenses
- **Tree Structure Visualization:** Generated using standard CLI `tree` utilities.
- **Documentation Framework:** Inspired by the "Living Documentation" pattern for agile software development.
- **Next.js:** Developed by Vercel (MIT License).
- **Docker:** Developed by Docker, Inc. (Apache License 2.0).
