# Project S — Nextcloud Productivity Integration Log

This document records the integration of the Nextcloud productivity suite into the Project S dashboard, serving as the platform's core collaboration layer.

---

## 1. Integration Goal

* To provide a comprehensive "Google Suite" alternative (Files, Calendar, Contacts, Mail).
* To establish a robust, self-hosted file synchronization backbone.
* To allow for modular extension via the extensive Nextcloud App Store.

## 2. Technical Architecture

The Nextcloud integration is a multi-container subsystem within the Project S stack.

* **Application:** `nextcloud:latest` (FPM/Apache variant).
* **Database:** `mariadb:10.6` (Dedicated instance for data integrity).
* **Storage:** Maps host `./data/nextcloud/data` to the container for direct file management.
* **Environment:** Configured with `MYSQL_HOST`, `MYSQL_DATABASE`, and `NEXTCLOUD_TRUSTED_DOMAINS` for automated setup.

## 3. Implementation Details

* **Dashboard Integration:** Embedded via `NextcloudSection.tsx`.
* **Sidebar Link:** Dedicated icon in the floating sidebar provides instant access to the productivity suite.
* **Glassmorphism:** The embedding container utilizes the standard `.glass` utility class to ensure visual harmony with the Aurora background.
* **Database Optimization:** MariaDB is configured with `--transaction-isolation=READ-COMMITTED` as per Nextcloud best practices.

## 4. Research & License Compliance

* **License:** Nextcloud is **GNU AGPLv3**.
* **Compliance Strategy:** Integrated as an external, containerized service. This satisfies the "optional module" requirement and prevents the AGPL license from affecting the Project S core MIT codebase.
* **Versatility:** Evaluated and confirmed as the most complete open-source solution for personal and business productivity (Ref: Task 4).

## 5. Credits & Licenses

* **Nextcloud:** The world's most deployed self-hosted collaboration platform — **GNU AGPLv3**.
* **MariaDB:** High-performance community-developed SQL server — **GNU GPLv2**.
* **Project Repository:** [github.com/nextcloud/server](https://github.com/nextcloud/server)
* **Lead Integrator:** Saad Shafique (@saadsh15).
