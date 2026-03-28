# Project S — Matrix Communications Integration Log

This document records the implementation of **Matrix Synapse** and **Element Web** as the primary communications suite for the Project S HomeForge ecosystem. It details the transition from initial research to a production-grade, PostgreSQL-backed deployment.

---

## 1. Goal: Decentered, Encrypted Communication

The objective was to provide a professional-grade alternative to Discord and Slack that is 100% self-hosted and supports End-to-End Encryption (E2EE) by default.

### Why Matrix?
- **Protocol:** Open standard for decentralized communication.
- **Security:** State-of-the-art encryption via the Olm/Megolm protocols.
- **Client Ecosystem:** Multiple clients (Element, Cinny, etc.) can connect to the same homeserver.
- **Data Sovereignty:** All messages, media, and room metadata stay on the user's local hardware.

---

## 2. Technical Architecture (Dockerized)

The Matrix stack is the first service in the ecosystem to move away from SQLite in favor of **PostgreSQL** for improved concurrency and reliability.

### 2.1 Multi-Container Stack (`docker-compose.yml`)

```yaml
synapse-db:
  image: postgres:15-alpine
  container_name: project-s-matrix-db
  volumes:
    - ./data/matrix/db:/var/lib/postgresql/data
  environment:
    - POSTGRES_USER=synapse
    - POSTGRES_DB=synapse
    - POSTGRES_PASSWORD=synapse_password

synapse:
  image: matrixdotorg/synapse:latest
  container_name: project-s-matrix-server
  depends_on:
    - synapse-db
  ports:
    - '8008:8008'
  volumes:
    - ./data/matrix/synapse:/data
    - ./config/matrix/homeserver.yaml:/data/homeserver.yaml
  environment:
    - SYNAPSE_CONFIG_PATH=/data/homeserver.yaml

element:
  image: vectorim/element-web:latest
  container_name: project-s-matrix-client
  ports:
    - '8082:80'
  volumes:
    - ./config/matrix/element-config.json:/app/config.json
```

---

## 3. Data & File Structure

The integration maintains a strict separation between the database backend, application state, and user configurations.

### 3.1 Repository Mapping

```text
OpenSource HomeLabbing/
├── config/
│   └── matrix/
│       ├── homeserver.yaml      ← Synapse server configuration
│       └── element-config.json  ← Element web client theme & server links
├── data/
│   └── matrix/
│       ├── db/                  ← PostgreSQL database files
│       └── synapse/             ← Media store, log config, & signing keys
└── Dashboard/
    └── (Future) matrix-section.tsx ← Planned iframe integration
```

### 3.2 Data Persistence Matrix

| Host Path | Container Path | Purpose |
| :--- | :--- | :--- |
| `data/matrix/db` | `/var/lib/postgresql/data` | Synapse relational data (Users, Rooms, Events). |
| `data/matrix/synapse` | `/data` | Signing keys, media cache, and runtime logs. |
| `config/matrix/homeserver.yaml` | `/data/homeserver.yaml` | The definitive server policy file. |

---

## 4. Configuration Highlights

- **Database Transition:** Switched from the default SQLite backend to a dedicated **Postgres 15** instance, requiring the `psycopg2` driver configuration.
- **Registration:** Enabled by default (`enable_registration: true`) to allow local user onboarding without external verification servers.
- **Localhost Alignment:** All client-side base URLs in `element-config.json` were refactored from hardcoded LAN IPs to `http://localhost:8008` for environment-neutral deployment.

---

## 5. Collaborative Contributions (`saadsh15`)

- **Service Definition:** Saad established the core three-container service stack (Server, Client, DB).
- **Postgres Integration:** Saad correctly identified the need for a robust SQL backend and implemented the initial database schema mapping.
- **Port Mapping:** Configured ports `8008` and `8082` to ensure no conflicts with existing Jellyfin or Nextcloud instances.
- **Documentation Draft:** Provided the initial technical overview of the Matrix system capabilities.

---

## 6. Iteration History

| Version | Date | Changes |
|---|---|---|
| v1 | 2026-03-27 | Initial Matrix research and service prototyping |
| v2 | 2026-03-28 | Implemented PostgreSQL backend and Element config injection |
| v3 | 2026-03-28 | Refactored folder structure to `/config` and corrected IP hardcoding |

---

## 7. Next Steps

- [x] Implement a `matrix-section.tsx` in the Dashboard to embed the Element client.
- [ ] Add Matrix room notifications for Docker system events (e.g., "Jellyfin container updated").
- [ ] Configure Federation via Nginx to allow communication with external Matrix users (matrix.org).

---

## 8. Credits & Reference

- **Matrix.org Foundation:** For the communication protocol of the future.
- **Implementation:** Saad Shafique (@saadsh15).
- **Audit & Review:** Basil Suhail.
- **Reference:** Task 38 in `Project_S_Roadmap.md`.

**Status:** Operational (v1.0).
