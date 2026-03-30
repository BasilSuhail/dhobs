# Project S

A collaborative project building a unified, self-hosted digital hub platform.

## About

This repository contains the implementation plan, product definition, technical feasibility analysis, and documentation for Project S — a self-hosted operating system for the home server that integrates the best open-source tools into a single, easy-to-manage interface.

---

## 1. 🚀 QUICK START (HOW TO STARTUP)

To start the entire Project S ecosystem perfectly with a single command, you can use the **`boom.sh`** script (recommended for Mac) or the specialized installation scripts:

### Option A: The "Boom" Script (Mac / Local)
```bash
chmod +x boom.sh
./boom.sh
```
*Cleans up, builds, starts all services, and launches your browser. Use this for day-to-day restarts.*

### Option B: The "Install" Script (Linux / First-Time Setup)
```bash
chmod +x install.sh
./install.sh
```
*Creates data directories, starts all containers, installs Nextcloud Hub apps (Calendar, Contacts, Office, Talk), and configures Nextcloud Office (Collabora). Run this once on a fresh clone.*

> **Nextcloud Office** is auto-configured on every subsequent container start via `config/nextcloud/setup-office.sh` (mounted as a Docker entrypoint hook). No manual steps needed after the first install.

### Option C: Manual Docker Setup

If you are building and running manually with `docker compose`, you **must** create your `.env` file first — otherwise all services will start with blank credentials and crash.

```bash
cp .env.example .env
```

Then open `.env` and fill in your passwords before starting:

```bash
docker compose up -d
```

> `boom.sh` and `install.sh` handle this automatically. Only do this step if you are running `docker compose` directly.


---

## 2. 📦 INTEGRATED SERVICES (WHAT IS ADDED)

The following services are currently functional and accessible via their own ports:

-   **Main Dashboard:** `http://localhost:3069`
-   **Jellyfin:** Media & Entertainment server (`:8096`).
-   **Nextcloud:** Cloud productivity and file management (`:8081`).
-   **Nextcloud Office (Collabora):** Document editing server (`:9980`) — auto-configured on container start.
-   **Theia IDE:** Integrated development environment (`:3030`).
-   **Matrix (Element):** Secure, encrypted communication suite (`:8082`).
-   **Vaultwarden:** Enterprise-grade password management (`:8083`).
-   **Kiwix:** Offline knowledge base (`:8084`).

---

## 3. 🛠️ ADDING NEW SERVICES (SCALING & EXPANSION)

To add more applications to the ecosystem:

1.  **Docker:** Add the service to `docker-compose.yml` and expose its host port.
2.  **Launcher:** Add the app to the `applications` array in `welcome-section.tsx`.
3.  **Metrics:** Add the app's metadata to the `appMeta` object in `app/page.tsx` if you want it tracked in the metrics tab.
4.  **Startup config:** If the service requires Nextcloud app settings (e.g. a WOPI URL), add an `occ` command to `config/nextcloud/setup-office.sh` — it runs automatically on every container start via the `before-starting` hook.

---

## 4. 📝 PROJECT DOCUMENTATION & LOGS

Stay up to date with the development progress through our detailed logging system:

-   **Technical Logs:** All research and implementation records are located in the **`Project_S_Logs/`** directory.
-   **Static UI Preview:** Open **`Project_S_Logs/06_Dashboard_Technical_Report.html`** in any browser for a functional, high-fidelity mirror of the dashboard frontend.

---

## Contributors

- [BasilSuhail](https://github.com/BasilSuhail)
- [saadsh15](https://github.com/saadsh15)
