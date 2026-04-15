# Project S — Nextcloud Productivity Integration Log

This document records the integration of the Nextcloud productivity suite into the Project S dashboard, serving as the core of the HomeForge collaboration and data synchronization layer.

---

## 1. Goal: A Self-Hosted Cloud Alternative

The primary goal was to replace proprietary cloud office suites with a secure, local alternative. Nextcloud provides a unified platform for file storage, document editing, and personal organization (Calendar, Contacts, Mail).

### Why Nextcloud?
- **All-in-One Suite:** Comprehensive cloud features in a single, self-hostable package.
- **Privacy-First:** User data never leaves the local environment.
- **Enterprise-Grade:** Highly scalable and reliable.

---

## 2. Technical Architecture (Dockerized)

The Nextcloud integration is the most complex subsystem in the HomeForge stack, utilizing a dual-container architecture for application logic and high-performance data storage.

### 2.1 Multi-Container Stack (`docker-compose.yml`)

```yaml
db:
  image: mariadb:10.6
  container_name: project-s-nextcloud-db
  command: --transaction-isolation=READ-COMMITTED --binlog-format=ROW
  environment:
    - MYSQL_ROOT_PASSWORD=nextcloud
    - MYSQL_DATABASE=nextcloud
    - MYSQL_USER=nextcloud
    - MYSQL_PASSWORD=nextcloud
  volumes:
    - ./data/nextcloud/db:/var/lib/mysql

nextcloud:
  image: nextcloud:latest
  container_name: project-s-nextcloud
  ports:
    - '8081:80'
  links:
    - db
  environment:
    - MYSQL_HOST=db
    - NEXTCLOUD_TRUSTED_DOMAINS=localhost 127.0.0.1
  volumes:
    - ./data/nextcloud/html:/var/www/html
    - ./data/nextcloud/data:/var/www/html/data
```

---

## 3. Data & File Structure

Nextcloud maintains a sophisticated data structure, separating application source files, internal databases, and user-facing assets.

### 3.1 Repository Mapping

```text
OpenSource HomeLabbing/
├── data/
│   └── nextcloud/
│       ├── db/                 ← MariaDB SQL storage files
│       ├── html/               ← Nextcloud app core, themes, & config
│       └── data/               ← Actual user-uploaded files & assets
└── Dashboard/Dashboard1/
    └── components/dashboard/
        └── nextcloud-section.tsx ← React component for iframe portal
```

### 3.2 Data Persistence Matrix

| Host Path | Container Path | Purpose |
| :--- | :--- | :--- |
| `data/nextcloud/db` | `/var/lib/mysql` | MariaDB storage for user profiles and metadata. |
| `data/nextcloud/html` | `/var/www/html` | Core application files (config, apps, themes). |
| `data/nextcloud/data` | `/var/www/html/data` | Primary storage for user files and photos. |

---

## 4. Dashboard Integration (`nextcloud-section.tsx`)

Nextcloud is integrated as a dedicated section in the HomeForge Dashboard, ensuring visual and spatial consistency.

- **Component:** `Dashboard/Dashboard1/components/dashboard/nextcloud-section.tsx`.
- **Embedding:** Uses a secure iframe pointing to `http://localhost:8081`.
- **Styling:** Adheres to the "Blackboard" theme with a `backdrop-blur-xl` glass container.
- **Navigation:** Integrated into the floating sidebar with a dedicated `Cloud` icon.

---

## 5. Collaborative Contributions (`Contributor`)

- **Database Tuning:** Saad configured MariaDB with specific flags (`--transaction-isolation=READ-COMMITTED`) to optimize performance for Nextcloud sync logic.
- **Automation:** Pre-configured `NEXTCLOUD_TRUSTED_DOMAINS` to ensure the dashboard can iframe the service out-of-the-box.
- **Multi-Volume Strategy:** Established the three-tier volume structure to separate app core from user assets.
- **Sidebar Integration:** Updated the Sidebar component to include a dedicated route for the Nextcloud section.

---

## 6. Licensing Strategy: Navigating AGPL

Nextcloud is licensed under **GNU AGPLv3**. Basil established a compliance strategy to protect the core Project S MIT codebase:
1. **Isolation:** Nextcloud runs as an independent container.
2. **Modular Interaction:** Communication occurs only via standard web protocols (HTTP/Iframes).
3. **No Linking:** No Project S internal code links to Nextcloud's AGPL libraries, ensuring the two remain legally distinct.

---

## 7. Iteration History

| Version | Date | Changes |
|---|---|---|
| v1 | 2026-03-24 | Initial dual-container definition (Nextcloud + MariaDB) |
| v2 | 2026-03-25 | Created `nextcloud-section.tsx` and updated sidebar navigation |
| v3 | 2026-03-26 | Configured MariaDB transactional isolation and trusted domains |

---

## 8. Next Steps

- [ ] Implement SSO/OpenID Connect for unified login between the Dashboard and Nextcloud.
- [ ] Connect Dashboard "Recent Files" widget to Nextcloud via WebDAV/REST API.
- [ ] Implement automated backups for the `data/nextcloud/data` directory.

---

## 9. Credits & Reference

- **Nextcloud Team:** For the leading self-hosted collaboration platform.
- **MariaDB Foundation:** For the rock-solid SQL backend.
- **Implementation:** Contributor (@Contributor).
- **Reference:** Task 4 in `Project_S_Roadmap.md`.

**Status:** Operational (v1.0).
