# Project S

A collaborative project building a unified, self-hosted digital hub platform.

## About

This repository contains the implementation plan, product definition, technical feasibility analysis, and documentation for Project S — a self-hosted operating system for the home server that integrates the best open-source tools into a single, easy-to-manage interface.

## Note
This will be the top version with all the described features there will be a different repository for a Business version and a lite version

## Deployment

Project S is fully containerized using a **Docker-in-Docker (DinD)** setup, allowing the entire ecosystem (Dashboard, Jellyfin, Nextcloud) to run within a single master container.

### Prerequisites
- Docker installed on your host machine.
- Privileged execution rights (required for DinD).

### Running with Docker
1. **Clone the repository:**
   ```bash
   git clone https://github.com/BasilSuhail/ProjectS-HomeForge.git
   cd ProjectS-HomeForge
   ```

2. **Start the environment:**
   Use the provided runner script to build and launch the master container:
   ```bash
   ./run-dind.sh
   ```

3. **Access Services:**
   Wait a few minutes for the internal build to complete, then access:
   - **Main Dashboard:** [http://localhost:3000](http://localhost:3000)
   - **Nextcloud:** [http://localhost:8081](http://localhost:8081)
   - **Jellyfin:** [http://localhost:8096](http://localhost:8096)
   - **Theia CodeSpace:** [http://localhost:3030](http://localhost:3030)
   - **Matrix (Element):** [http://localhost:8082](http://localhost:8082)

### Data Persistence
Project data and configurations are persisted in the `./dind-data` directory on your host machine.

### Developer CodeSpace (Theia IDE)
The integrated Theia CodeSpace provides a professional development environment:
- **Persistent Workspace:** All code and files created in the IDE are stored in the `./workspace` directory on the host.
- **Docker Integration:** You can run `docker` commands directly from the Theia terminal to manage the Project S ecosystem or build new containers.
- **Native Experience:** Full filesystem access within the workspace allows for a seamless, VS Code-like experience.

## Contributors

- [BasilSuhail](https://github.com/BasilSuhail)
- [saadsh15](https://github.com/saadsh15)
