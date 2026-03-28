# Project S — Kiwix Offline Knowledge Integration Log

This document records the implementation of **Kiwix** as the primary offline knowledge base for the Project S HomeForge ecosystem. It details the integration of a custom-built Kiwix JS reader into the unified dashboard.

---

## 1. Goal: Accessible Knowledge Without Internet

The objective was to provide users with a "Self-Hosted Wikipedia" that remains fully functional even during internet outages. This ensures critical documentation and educational resources are always available.

### Why Kiwix?
- **Offline First:** Designed to read ZIM files containing entire websites (Wikipedia, WikiHow, etc.).
- **Privacy:** Search queries and reading habits never leave the local network.
- **Portability:** High-performance, low-resource usage suitable for all homelab environments.

---

## 2. Technical Architecture (Dockerized)

The Kiwix integration uses a specialized **Kiwix JS** frontend for a modern, responsive web experience.

### 2.1 Service Configuration (`docker-compose.yml`)

```yaml
kiwix:
  build:
    context: ./Kiwix/kiwix-js
    dockerfile: Dockerfile
  container_name: project-s-kiwix-reader
  ports:
    - '8084:80'
  volumes:
    - ./data/kiwix:/usr/share/nginx/html/data
  restart: unless-stopped
```

---

## 3. Data & File Structure

The integration maintains a simple but effective mapping between the ZIM library on the host and the internal Nginx server.

### 3.1 Repository Mapping

```text
OpenSource HomeLabbing/
├── Kiwix/
│   └── kiwix-js/                ← Custom Docker build context
├── data/
│   └── kiwix/                   ← Storage for .zim files
└── Dashboard/Dashboard1/
    └── components/dashboard/
        └── kiwix-section.tsx    ← React component for iframe portal
```

### 3.2 Data Persistence Matrix

| Host Path | Container Path | Purpose |
| :--- | :--- | :--- |
| `data/kiwix` | `/usr/share/nginx/html/data` | Primary storage for compressed .zim archives. |

---

## 4. Dashboard Implementation

Kiwix is integrated as a dedicated section within the Dashboard, providing a seamless "OS-like" experience.

- **Component:** `Dashboard/Dashboard1/components/dashboard/kiwix-section.tsx`.
- **Embedding:** Uses a secure iframe pointing to `http://localhost:8084`.
- **Navigation:** Added to the floating sidebar with a dedicated `Book` icon.

---

## 5. Collaborative Contributions (`saadsh15`)

- **Dockerization:** Saad developed the custom Docker build strategy for the Kiwix JS reader.
- **Port Management:** Correctly assigned port `8084` to prevent collisions with Matrix and Vaultwarden.
- **UI Scaffold:** Provided the initial sidebar and welcome-section entries to ensure the module was discoverable.

---

## 6. Iteration History

| Version | Date | Changes |
|---|---|---|
| v1 | 2026-03-27 | Initial Kiwix research and Dockerfile prototyping |
| v2 | 2026-03-28 | Integrated into dashboard navigation and fixed port management |

---

## 7. Next Steps

- [ ] Implement a ZIM file downloader/manager within the Dashboard UI.
- [ ] Connect "Search" global bar to search indexed Kiwix libraries via API.
- [ ] Implement automated library updates for Wikipedia snapshots.

---

## 8. Credits & Reference

- **Kiwix Team:** For the best offline content solution.
- **Implementation:** Saad Shafique (@saadsh15).
- **Strategy & Review:** Basil Suhail.
- **Reference:** Task 12 and Task 50 in `Project_S_Roadmap.md`.

**Status:** Operational (v1.0).
