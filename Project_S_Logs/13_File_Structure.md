# Project S — File Structure & Repository Map

This document provides a comprehensive overview of the Project S directory structure, detailing the purpose of key files and folders for developers and maintainers.

---

## 1. Root Directory Layout

The repository is organized into four main zones: Orchestration, Dashboard, Documentation, and Data.

* **Orchestration Layer:**
    * `docker-compose.yml`: Defines the core service stack.
    * `Dockerfile.dind`: The isolated environment definition.
    * `run-dind.sh`: The master initialization script.
* **Frontend Layer (`Dashboard/`):**
    * `Dashboard1/`: The Next.js application source.
    * `Dashboard1/components/`: Modular UI sections (Media, Storage, etc.).
* **Documentation Layer (`Project_S_Logs/`):**
    * A chronological and thematic record of the project (01-13).
* **Data Layer (`data/`, `db/`, `dind-data/`):**
    * Persistent storage for all containerized applications.

## 2. Dashboard Internal Structure (`/Dashboard/Dashboard1`)

| Path | Purpose |
|---|---|
| `app/` | Routing, global styles, and root layout. |
| `components/dashboard/` | Core sections: `media`, `nextcloud`, `sidebar`, `storage`. |
| `components/ui/` | Reusable shadcn/ui primitives. |
| `hooks/` | Custom React hooks for UI state and responsiveness. |
| `lib/` | Utility functions (`cn` helper, date formatting). |
| `public/` | Static images, icons, and placeholder assets. |

## 3. Data Persistence Map

* **`/data/jellyfin`**: Media metadata and user profiles.
* **`/data/nextcloud`**: User files, HTML root, and app data.
* **`/db/nextcloud`**: MariaDB SQL storage.
* **`/dind-data`**: Recursive storage for user-spawned containers.

## 4. Project S Logs Directory (`/Project_S_Logs`)

1. **01-05**: Founding principles, roadmap, product definition, and design system.
2. **06-07**: Technical reporting and security/integration audits.
3. **08-12**: Detailed implementation logs for Docker, Jellyfin, Nextcloud, Storage, and Theia.
4. **13**: This repository map.

## 5. Credits & Licenses

* **Repository Architecture:** Designed for modularity and "living documentation" standards.
* **Tools:** Tree structure visualized via standard POSIX utilities.
* **Maintenance:** Saad Shafique (@saadsh15).
