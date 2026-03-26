# Project S — Nextcloud Productivity Integration Log

This document records the integration of the Nextcloud productivity suite into the Project S dashboard.

---

## 1. Summary
Nextcloud serves as the productivity backbone for Project S, providing file synchronization, document editing, and collaborative tools (Calendar, Contacts, Mail).

---

## 2. Selection Rationale
Nextcloud was chosen as the "Google Suite" replacement for its maturity and massive app ecosystem. While it is **AGPL licensed**, it is integrated as a standalone service in the Docker Compose stack, ensuring it remains an optional, user-deployable module that doesn't conflict with the project's core licensing goals.

---

## 3. Implementation: `NextcloudSection.tsx`
Integration is achieved via a dedicated `NextcloudSection` component:
- **Iframe Integration:** The full Nextcloud UI is embedded, ensuring all apps (Files, Talk, etc.) are immediately available.
- **Database Link:** Nextcloud is connected to a dedicated MariaDB container (`db`) within the internal Docker network for metadata persistence.
- **UI Consistency:** The embedding container uses the standard glassmorphism tokens to match the Dashboard's visual language.

---

## 4. Credits & Licenses
- **Nextcloud:** Developed by Nextcloud GmbH and the global contributor community (GNU AGPLv3).
- **Project Site:** [nextcloud.com](https://nextcloud.com)
- **Repository:** [github.com/nextcloud/server](https://github.com/nextcloud/server)
