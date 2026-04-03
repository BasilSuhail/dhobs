# Project S — Kiwix Installation and Workflow Log

This document details the complete lifecycle and operational workflow of the **Kiwix** offline knowledge base within the Project S environment. It covers everything from the initial setup via `install.sh` to the container deployment and the Dashboard UI integration.

---

## 1. Directory Initialization (`install.sh` / `boom.sh`)

When the user runs the initial setup scripts (`./install.sh` or `./boom.sh`), the system prepares the host environment for Kiwix:

```bash
# Extract from install.sh
echo "Creating data and configuration directories..."
...
mkdir -p ./data/kiwix
```

**Purpose:**
This creates a persistent local directory (`./data/kiwix`) on the host machine. This directory serves as the centralized storage location where the user will drop their downloaded `.zim` files (compressed archives of websites like Wikipedia, StackOverflow, etc.).

---

## 2. Docker Deployment (`docker-compose.yml`)

The core of the Kiwix service is managed via Docker Compose. The configuration is defined as follows:

```yaml
  kiwix:
    image: ghcr.io/kiwix/kiwix-serve:3.7.0
    container_name: project-s-kiwix-reader
    ports:
      - '8084:80'
    volumes:
      - ./data/kiwix:/data
    command: sh -c "kiwix-serve --port=80 *.zim || (echo 'No ZIM files found. Please add .zim files to ./data/kiwix' && sleep infinity)"
    restart: unless-stopped
```

**Workflow Mechanics:**
1. **Image:** Uses the official `ghcr.io/kiwix/kiwix-serve` image, ensuring a lightweight and performant web server specifically designed for serving ZIM files.
2. **Volume Mapping:** The host directory `./data/kiwix` is mounted to `/data` inside the container. This grants the container read access to the ZIM files downloaded by the user.
3. **Port Mapping:** The internal port `80` of the container is exposed to port `8084` on the host machine.
4. **Resilient Command Execution:** 
   - The command attempts to start `kiwix-serve`, instructing it to serve all `*.zim` files found in the working directory.
   - **Fail-safe:** If no `.zim` files are found (which is true on a fresh install), `kiwix-serve` would normally crash and cause the container to enter a restart loop. The `|| (echo ... && sleep infinity)` logic prevents this. It logs a helpful message and keeps the container alive in an idle state until the user adds `.zim` files and restarts the container.

---

## 3. Dashboard Integration & API

The user interacts with Kiwix through the unified Next.js dashboard, creating an "OS-like" windowed experience.

### A. Backend API (`Dashboard/Dashboard1/app/api/kiwix/route.ts`)
The Next.js backend provides an endpoint to inspect the available ZIM files:
- It reads the mounted directory (`/data/kiwix` as accessed by the Dashboard container).
- It filters for files ending in `.zim`.
- It calculates the file sizes and returns a JSON array of available ZIM files.

### B. Frontend UI (`Dashboard/Dashboard1/components/dashboard/kiwix-section.tsx`)
The frontend component creates a seamless user experience based on the API response:
1. **Initial Check:** It fetches `/api/kiwix` to see if any ZIM files exist.
2. **Empty State:** If no files are found (array is empty), it prevents the iframe from loading. Instead, it displays a stylized, user-friendly prompt instructing the user to:
   - Visit `library.kiwix.org`
   - Download `.zim` files.
   - Place them in `./data/kiwix/`
   - Restart the Kiwix container.
3. **Active State:** If ZIM files are detected, it dynamically renders an `iframe` pointing to `http://<host>:8084`. This seamlessly embeds the native Kiwix web UI directly into the Project S dashboard, allowing users to browse their offline knowledge base without leaving the ecosystem.

---

## 4. Health Monitoring (`health.sh`)

The system's health script actively monitors the Kiwix service by checking the exposed HTTP endpoint:

```bash
# Extract from health.sh
check_service "Kiwix" "http://localhost:8084"
```
This ensures the user is aware of the service status during routine system diagnostics.

---

## Summary of the User Journey

1. **Install:** User runs `./install.sh`. The `./data/kiwix` folder is created.
2. **Start:** User runs Docker Compose. The Kiwix container starts up but idles because there are no files.
3. **Discover:** User opens the Dashboard, clicks the Kiwix icon, and sees the "Library is empty" instruction screen.
4. **Action:** User downloads a `.zim` file (e.g., Wikipedia) and moves it to `./data/kiwix`.
5. **Reload:** User restarts the Kiwix container (`docker restart project-s-kiwix-reader`).
6. **Consume:** User returns to the Dashboard. The API detects the file, the iframe loads, and the offline Wikipedia is fully accessible on port 8084.