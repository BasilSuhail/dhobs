# Project S — Docker Infrastructure & Orchestration Log

This document details the core containerization strategy and the deployment architecture for the Project S HomeForge environment. It explains the "Master Container" (Docker-in-Docker) approach and the internal orchestration of the service stack.

---

## 1. Orchestration Philosophy: The "Master Container"

Project S uses a **Nested Docker (DinD)** architecture to provide a completely isolated, portable environment. This prevents "host pollution" where multiple services clutter the user's primary OS.

### 1.1 Architecture Diagram

```text
Host System (macOS/Linux)
└── run-dind.sh (Entry point)
    └── project-s-homeforge-dind (Master Container - Privileged)
        ├── Docker Daemon (Internal)
        ├── Docker Compose (Internal Orchestrator)
        └── Internal Network (172.18.0.0/16)
            ├── project-s-dashboard (Next.js) :3069
            ├── project-s-jellyfin (Media)   :8096
            ├── project-s-nextcloud (Productivity) :8081
            └── project-s-nextcloud-db (MariaDB)
```

### 1.2 Why Docker-in-Docker (DinD)?

| Feature | Benefit |
|---|---|
| **Zero Host Requirements** | Users only need Docker installed. No need for Node.js, Python, or DBs on the host. |
| **Atomic Cleanup** | Deleting the Master Container removes every trace of the stack, including internal networks and volumes (unless mapped). |
| **Security Sandbox** | Vulnerabilities in internal services are double-layered; they must escape the internal container *and* the Master Container. |
| **Port Mapping** | We map only necessary ports (3069, 8096, 8081) to the host, keeping the internal service mesh private. |

---

## 2. Infrastructure Components

### 2.1 `Dockerfile.dind` (The Master Image)
The Master Container is based on `docker:24-dind` (Alpine). It is customized to include the full Project S source and a startup manager.

- **Alpine 3.19:** Minimal footprint.
- **Tools:** `docker-cli-compose`, `bash`.
- **Startup Script (`/start.sh`):**
    1. Launches `dockerd` (the internal daemon) in the background.
    2. Polls `docker info` until the daemon is responsive.
    3. Executes `docker compose up` inside the container to spin up the sub-stack.

### 2.2 `run-dind.sh` (The Bootstrapper)
This script automates the build and execution of the Master Container.

- **Privileged Mode:** Required (`--privileged`) for the internal Docker daemon to manage cgroups and networking.
- **Recursive Persistence:** Maps `$(pwd)/dind-data` on the host to `/homeforge/data` inside the Master. This ensures that even if the Master is rebuilt, the sub-service data (Jellyfin/Nextcloud) survives.

---

## 3. Internal Service Stack (`docker-compose.yml`)

The internal stack defines four primary services:

| Service | Image | Purpose |
|---|---|---|
| `dashboard` | `(local build)` | Next.js 15 UI, the "brain" of Project S. |
| `jellyfin` | `jellyfin/jellyfin` | Media server and NAS management. |
| `nextcloud` | `nextcloud:latest` | Productivity suite (Files, Docs, Calendar). |
| `db` | `mariadb:10.6` | Dedicated SQL backend for Nextcloud. |

### Dashboard Multi-Stage Build
The dashboard `Dockerfile` (located in `Dashboard/Dashboard1/`) uses a 3-stage pipeline:
1. **Deps:** Installs `npm` dependencies.
2. **Builder:** Runs `npm run build` to generate the `.next` output.
3. **Runner:** A minimal production image that only contains the standalone server and static assets, reducing image size by ~80%.

---

## 4. Setup & Deployment Guide

To launch the full HomeForge environment from scratch:

1. **Clone the repo:** `git clone <repo-url>`
2. **Execute Bootstrapper:**
   ```bash
   chmod +x run-dind.sh
   ./run-dind.sh
   ```
3. **Monitor Progress:**
   ```bash
   sudo docker logs -f homeforge-master
   ```
4. **Access UI:** Open [http://localhost:3069](http://localhost:3069) once the dashboard container reports healthy.

---

## 5. Credits & Licensing

- **Docker/Compose:** Apache 2.0.
- **Alpine Linux:** MIT.
- **Orchestration Logic:** Designed and implemented by Contributor (@Contributor).
- **Audit Reference:** Follows the security guidelines established in `07_Docker_Integration_Audit.md`.

**Status:** Operational.
**Next Steps:** Implement Traefik or Nginx-Proxy-Manager within the stack for SSL termination.
