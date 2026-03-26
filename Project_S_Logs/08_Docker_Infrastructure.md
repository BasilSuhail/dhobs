# Project S — Docker Infrastructure Implementation Log

This document details the core containerization strategy and the deployment architecture for the Project S HomeForge environment. It serves as the definitive record for the project's orchestration layer.

---

## 1. Orchestration Strategy

* **Platform Choice:** Docker Compose was selected as the primary orchestrator for its balance of simplicity and production-grade reliability.
* **Network Isolation:** All services reside on a private bridge network, with only the Dashboard and specified public services exposed to the host.
* **Volume Persistence:** Strict mapping between host directories (`./data`, `./config`) and container paths ensures that user data is persistent across updates.

## 2. Docker-in-Docker (DinD) Architecture

The "Master Container" approach provides a secure sandbox for user applications without compromising the host's Docker socket.

* **Base Image:** `docker:24-dind` (Alpine-based).
* **Security:** Runs in `--privileged` mode to allow nested container management and internal networking.
* **Initialization:** A custom `/start.sh` handles the sequential startup of the internal Docker daemon and the service stack.
* **Host Mapping:** Host `./dind-data` is mapped to internal `/homeforge/data` for recursive persistence.

## 3. Multi-Stage Build Pipeline

The Project S Dashboard utilizes a multi-stage `Dockerfile` to optimize for security and performance.

* **Stage 1: Dependencies (`deps`)**
    * Uses `node:20-alpine`.
    * Installs `libc6-compat` for binary compatibility.
    * Executes `npm ci` for deterministic dependency resolution.
* **Stage 2: Builder (`builder`)**
    * Copies dependencies and source code.
    * Executes `npm run build` to generate the Next.js standalone package.
* **Stage 3: Runner (`runner`)**
    * Minimal production image running as a non-root `nextjs` user.
    * Environment: `NODE_ENV=production`, `PORT=3000`.
    * Output: Includes only `.next/standalone` and `.next/static`.

## 4. Technical Specifications

| Component | Version | Port | Persistence Path |
|---|---|---|---|
| Docker | 24.x | N/A | `/var/lib/docker` (internal) |
| Docker Compose | 2.x | N/A | N/A |
| Node.js | 20.x (LTS) | 3000 | `/app/.next` |
| OS | Alpine 3.19 | N/A | N/A |

## 5. Deployment Workflow

1. Execute `./run-dind.sh` with root/sudo privileges.
2. The script builds `project-s-homeforge-dind` if not present.
3. The Master Container initiates the internal Compose stack: `dashboard`, `jellyfin`, `nextcloud`, `db`.
4. Health checks monitor service availability before exposing ports to the host.

## 6. Credits & Licenses

* **Docker & Docker Compose:** Developed by Docker, Inc. — **Apache License 2.0**.
* **Docker-in-Docker (DinD):** Originally conceived by Jérôme Petazzoni — **Apache License 2.0**.
* **Alpine Linux:** Security-oriented, lightweight Linux distribution — **MIT License**.
* **Implementation:** Saad Shafique (@saadsh15).
