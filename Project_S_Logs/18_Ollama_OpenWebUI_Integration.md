# Ollama + Open WebUI Integration Log (COMPLETED)

## Overview

Added local LLM support to Project S via Ollama (backend) and Open WebUI (chat frontend). Also resolved several pre-existing service failures discovered during testing.

---

## New Services Added

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| Ollama | `ollama/ollama:0.6.5` | `11434` | Local LLM inference engine |
| Open WebUI | `ghcr.io/open-webui/open-webui:0.6.5` | `8085` | ChatGPT-like chat UI for Ollama |

### Data Persistence
- Ollama models: `./data/ollama:/root/.ollama`
- Open WebUI data: `./data/open-webui:/app/backend/data`
- Shared workspace: `./data/workspace:/workspace` (mounted in Ollama)

---

## Architecture

```
Browser → http://localhost:8085 → Open WebUI → http://ollama:11434 → Ollama
```

Open WebUI runs as a frontend only. All model inference is handled by the Ollama container. The two communicate over the internal Docker network.

---

## Terminal → Theia Exec

The dashboard terminal was upgraded to exec into the Theia container instead of running a shell inside the minimal dashboard image.

### How it works
1. On each WebSocket connection, `custom-server.ts` queries the Docker socket HTTP API to check if `project-s-theia` is running
2. If running: `docker exec -it -w /home/project/workspace project-s-theia /bin/bash`
3. If not running: falls back to local `/bin/bash`

### Key fixes required
- Dashboard container must run as `root` (`user: root` in docker-compose) — the `nextjs` user cannot access `/var/run/docker.sock` on macOS due to GID mismatch
- Docker socket must be queried via HTTP API (`http.get({ socketPath: '/var/run/docker.sock' })`) not the `docker` CLI binary
- Terminal starts in `/home/project/workspace` — same volume mounted in Theia IDE, so files created in either terminal are immediately visible in both

---

## Bugs Fixed During This Session

| Service | Issue | Fix |
|---------|-------|-----|
| Synapse (Matrix) | `postgres:16` incompatible with PG15 data | Pinned back to `postgres:15-alpine` |
| Synapse | `homeserver.yaml` YAML parse error — password on wrong line | Fixed indentation |
| Nextcloud | Image `nextcloud:30` but data was v33.0.1.2 | Upgraded to `nextcloud:33` |
| Jellyfin | Missing `MaxParentalAgeRating` column in DB | Upgraded to `jellyfin/jellyfin:10.10` |
| Nextcloud hooks | `setup-office.sh` Permission denied (exit 126) | Fixed file permissions to executable |
| Open WebUI | Crash loop on first start | Increased memory limit from 512m → 2g (embedding model download) |

---

## PRs

- **#40** — Terminal Theia exec, Ollama, Kiwix ZIM listing, bug fixes (squash merged)
- **#42** — Open WebUI (feat/open-webui branch, pending merge)

---

## Usage

### Pull and run a model
```bash
# From the dashboard terminal (execs into Theia):
docker exec project-s-ollama ollama pull llama3.2
docker exec project-s-ollama ollama list
```

### Chat UI
Open `http://localhost:8085` — create an admin account on first visit, then select a model and chat.
