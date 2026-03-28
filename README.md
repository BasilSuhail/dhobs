# Project S

A collaborative project building a unified, self-hosted digital hub platform.

## About

This repository contains the implementation plan, product definition, technical feasibility analysis, and documentation for Project S — a self-hosted operating system for the home server that integrates the best open-source tools into a single, easy-to-manage interface.

---

## 1. 🚀 QUICK START (HOW TO STARTUP)

To build and start the entire Project S ecosystem with a single command, use the **`boom.sh`** script located in the root directory:

```bash
./boom.sh
```

**What this script does:**
1.  **Clean Up:** Automatically removes any old or conflicting containers.
2.  **Permissions:** Automatically fixes file permission issues.
3.  **Build & Run:** Performs a fresh build of the dashboard and starts all services (Jellyfin, Nextcloud, Matrix, etc.).
4.  **Health Check:** Waits for the Dashboard to be fully ready.
5.  **Auto-Launch:** Automatically opens your default web browser to the dashboard at `http://localhost:3069`.

---

## 2. 📦 INTEGRATED SERVICES (WHAT IS ADDED)

The following services are currently functional and accessible via their own ports:

-   **Main Dashboard:** `http://localhost:3069`
-   **Jellyfin:** `http://localhost:8096`
-   **Nextcloud:** `http://localhost:8081`
-   **Matrix (Element):** `http://localhost:8082`
-   **Vaultwarden:** `http://localhost:8083`
-   **Theia CodeSpace:** `http://localhost:3030`

---

## 3. 🛠️ THE DYNAMIC DOCK (RECENT APPS)

The Project S Sidebar acts as a smart "Apple-style" dock:
-   **Timed Persistence:** When you open an application from the Home grid, its icon appears in the dock.
-   **Auto-Cleanup:** If an application is not used or focused for **5 minutes**, it will automatically vanish from the dock to keep your workspace clean.
-   **State Management:** Minimized apps stay in the dock (grayed out) until they either time out or are closed manually.

---

## 4. 🛠️ ADDING NEW SERVICES (SCALING & EXPANSION)

To add more applications to the ecosystem:

1.  **Docker:** Add the service to `docker-compose.yml` and expose its host port.
2.  **Launcher:** Add the app to the `applications` array in `welcome-section.tsx`.
3.  **Windowing:** Define the window component in `app/page.tsx` and add its metadata to the `appMeta` object.

---

## 5. 📝 PROJECT DOCUMENTATION & LOGS

-   **Technical Logs:** All research and implementation records are located in the **`Project_S_Logs/`** directory.
-   **Static UI Preview:** Open **`Project_S_Logs/06_Dashboard_Technical_Report.html`** for a high-fidelity mirror of the dashboard frontend.

---

## Contributors

- [BasilSuhail](https://github.com/BasilSuhail)
- [saadsh15](https://github.com/saadsh15)
