# Project S — Vaultwarden Password Management Log

This document records the implementation of **Vaultwarden** as the primary password management solution for the Project S HomeForge ecosystem. It details the integration of an enterprise-grade Bitwarden-compatible server into the dashboard.

---

## 1. Goal: Unified, Secure Credential Storage

The objective was to provide a professional-grade password manager that is 100% self-hosted and fully compatible with the Bitwarden client ecosystem (Web, Mobile, Browser Extensions).

### Why Vaultwarden?
- **Lightweight Implementation:** A Rust-based Bitwarden API server with minimal memory footprint.
- **Client Support:** Works seamlessly with official Bitwarden apps and extensions.
- **Privacy:** All vaults, attachments, and organization data are stored locally in the HomeForge stack.
- **Advanced Features:** Includes support for organizations, collections, and multi-factor authentication.

---

## 2. Technical Architecture (Dockerized)

Vaultwarden is integrated as a standalone service in the HomeForge stack, optimized for secure, isolated data storage.

### 2.1 Service Configuration (`docker-compose.yml`)

```yaml
vaultwarden:
  image: vaultwarden/server:latest
  container_name: project-s-vaultwarden
  ports:
    - '8083:80'
  volumes:
    - ./data/vaultwarden:/data
  environment:
    - WEBSOCKET_ENABLED=true
    - DATA_FOLDER=/data
  restart: unless-stopped
```

---

## 3. Data & File Structure

Vaultwarden maintains a highly secure data store that is encrypted at rest by the application before touching the disk.

### 3.1 Repository Mapping

```text
OpenSource HomeLabbing/
├── data/
│   └── vaultwarden/             ← SQL database, attachments, and keys
└── Dashboard/Dashboard1/
    └── components/dashboard/
        └── vaultwarden-section.tsx ← React component for secure vault portal
```

### 3.2 Data Persistence Matrix

| Host Path | Container Path | Purpose |
| :--- | :--- | :--- |
| `data/vaultwarden` | `/data` | SQLite/Postgres data store and sensitive RSA keys. |

---

## 4. Configuration Highlights

- **WebSocket Support:** Enabled `WEBSOCKET_ENABLED: true` to support real-time vault synchronization across multiple devices.
- **Port Orchestration:** Saad assigned port `8083` to ensure no conflicts with Nextcloud (`8081`), Matrix (`8082`), or the Dashboard (`3069`).
- **Data Path:** Standardized the `/data` folder for all persistent assets, including user icons and file attachments.

---

## 5. Collaborative Contributions (`Contributor`)

- **Security Implementation:** Saad implemented the core Vaultwarden service with proper environment variable scoping.
- **Infrastructure:** Saad correctly mapped the volume persistence strategy to ensure vault data survives container rebuilds.
- **Dashboard Hook:** Added the initial `Key` icon and navigation routing in the Sidebar and WelcomeSection components.

---

## 6. Iteration History

| Version | Date | Changes |
|---|---|---|
| v1 | 2026-03-27 | Initial Vaultwarden research and service definition |
| v2 | 2026-03-28 | Implemented volume mapping and WebSocket support |

---

## 7. Next Steps

- [ ] Implement a custom Dashboard widget showing vault health and credential counts.
- [ ] Configure automatic daily backups for the `data/vaultwarden` directory.
- [ ] Integrate Vaultwarden with the Project S Single Sign-On (SSO) system.

---

## 8. Credits & Reference

- **Vaultwarden Team:** For the leading Rust-based password manager.
- **Bitwarden Team:** For the industry-standard open-source password protocol.
- **Implementation:** Contributor (@Contributor).
- **Strategy & Review:** Author.
- **Reference:** Task 14 and Task 41 in `Project_S_Roadmap.md`.

**Status:** Operational (v1.0).
