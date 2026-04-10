# 31 — Network Segmentation (Phase 2)

Date: 2026-04-10
Author: Basil Suhail
Related Issue: #176
Branch: `phase-2/network-segmentation`
PR: #178

---

## Context

All 15 containers shared a single default Docker Compose network. Every container could reach every other container. Databases (MariaDB, Postgres) were reachable from all services. Ollama's port 11434 was exposed to the host — only Open-WebUI needed it.

---

## Changes Made

### 1. Three Docker Networks Defined

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
  database:
    driver: bridge
```

### 2. Service Assignment

| Network | Services |
|---|---|
| **frontend** | dashboard, element, openvpn-ui, kiwix-manager, open-webui |
| **backend** | jellyfin, nextcloud, collabora, theia, synapse, vaultwarden, kiwix, ollama, openvpn |
| **database** | db (MariaDB), synapse-db (Postgres) |

### 3. Cross-Network Assignments

| Service | Networks | Reason |
|---|---|---|
| dashboard | frontend + backend | Needs to reach all services for health checks |
| open-webui | frontend + backend | Needs ollama on backend |
| nextcloud | backend + database | Needs MariaDB |
| synapse | backend + database | Needs Postgres |

### 4. Ollama Port Removed

Removed `ports: - '11434:11434'` from Ollama. Only Open-WebUI reaches it internally via Docker DNS (`http://ollama:11434`).

---

## Impact

| Metric | Before | After |
|---|---|---|
| Networks | 1 (default) | 3 (frontend, backend, database) |
| Database isolation | None | Isolated on database network only |
| Ollama host port | Exposed (11434) | Internal only |

---

## Testing

- `docker compose config --quiet` passes
- All services start and respond correctly
- Dashboard metrics show all services healthy

---

**Status:** Merged. PR #178.
