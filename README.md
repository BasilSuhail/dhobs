# Project S

A collaborative project building a unified, self-hosted digital hub platform.

## About

This repository contains the implementation plan, product definition, technical feasibility analysis, and documentation for Project S — a self-hosted operating system for the home server that integrates the best open-source tools into a single, easy-to-manage interface.

## Note
This will be the top version with all the described features there will be a different repository for a Business version and a lite version

## Deployment

Project S can be deployed using a standard Docker Compose setup (recommended for Linux) or a **Docker-in-Docker (DinD)** setup.

### Prerequisites
- Docker and Docker Compose installed on your host machine.

### Installation (Linux Recommended)
1. **Clone the repository:**
   ```bash
   git clone https://github.com/BasilSuhail/ProjectS-HomeForge.git
   cd ProjectS-HomeForge
   ```

2. **Run the installation script:**
   This script creates the necessary data directories, initializes configurations, and starts the environment:
   ```bash
   ./install.sh
   ```

### Running with Docker-in-Docker (Alternative) for MAC
For isolated environments, use the provided runner script to build and launch the master container:
```bash
./run-dind.sh
```

### Access Services
Once the containers are running, you can access the following services:
- **Main Dashboard:** [http://localhost:3069](http://localhost:3069)
- **Nextcloud:** [http://localhost:8081](http://localhost:8081)
- **Jellyfin:** [http://localhost:8096](http://localhost:8096)
- **Code Server (Theia):** [http://localhost:3030](http://localhost:3030)
- **Matrix (Element):** [http://localhost:8082](http://localhost:8082)
- **Vaultwarden:** [http://localhost:8083](http://localhost:8083)

> **Note:** For security and performance, services like Nextcloud, Matrix, and Vaultwarden open in a new browser tab when accessed from the dashboard.

### Data Persistence
Project data and configurations are persisted in the `./data` directory (for standard install) or `./dind-data` (for DinD) on your host machine.

### Developer CodeSpace (Theia IDE)
The integrated Theia CodeSpace provides a professional development environment:
- **Persistent Workspace:** All code and files created in the IDE are stored in the `./workspace` directory on the host.
- **Docker Integration:** You can run `docker` commands directly from the Theia terminal to manage the Project S ecosystem or build new containers.
- **Native Experience:** Full filesystem access within the workspace allows for a seamless, VS Code-like experience.

## Contributors

- [BasilSuhail](https://github.com/BasilSuhail)
- [saadsh15](https://github.com/saadsh15)
