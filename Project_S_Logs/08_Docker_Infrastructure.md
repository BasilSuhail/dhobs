# Project S — Docker Infrastructure Implementation Log

This document details the core containerization strategy and the deployment architecture for the Project S HomeForge environment.

---

## 1. Summary
The Project S infrastructure is built on **Docker Compose** to ensure modularity and isolation. For user-deployed applications, a **Docker-in-Docker (DinD)** approach provides a sandboxed environment that protects the host system.

---

## 2. Architecture: Docker Compose
Docker Compose was chosen for its simplicity and portability. The entire stack is defined in `docker-compose.yml`, allowing for "one-click" deployments across different hardware architectures.

### 2.1 Service Configuration
The core stack manages networks and volumes to ensure persistence and internal communication via service names (e.g., `db` for MariaDB).

---

## 3. Dashboard Multi-Stage Build
The dashboard uses a multi-stage `Dockerfile` to produce a high-performance, secure production image:
- **Build Stages:** `deps` (dependency installation), `builder` (Next.js build), and `runner` (the final lightweight image).
- **Security:** The container runs as a non-root user (`nextjs`) to minimize the attack surface.

---

## 4. Docker-in-Docker (DinD)
To allow nested containerization, Project S uses a custom **Master Container** (`Dockerfile.dind`):
- **Isolation:** Users can run their own containers inside this sandbox.
- **`run-dind.sh`**: Orchestrates the launch of the Master Container in privileged mode with persistent volume mapping to `./dind-data`.

---

## 5. Setup Guide
1. Run `./run-dind.sh` to initialize the environment.
2. Monitor logs: `sudo docker logs -f homeforge-master`.
3. Access services via `localhost` ports 3000 (Dashboard), 8096 (Jellyfin), and 8081 (Nextcloud).

---

## 6. Credits & Licenses
- **Docker & Docker Compose:** Developed by Docker, Inc. (Apache License 2.0).
- **Docker-in-Docker (DinD):** Originally maintained by Jérôme Petazzoni and the Docker project.
- **Alpine Linux:** The base image used for the dashboard runner (MIT License).
