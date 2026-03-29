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
*Automatically cleans up, builds, starts all services, and launches your browser.*

### Option B: The "Install" Script (Linux / Standard)
```bash
chmod +x install.sh
./install.sh
```
*Creates data directories and starts standard Docker Compose.*

### Option C: Docker-in-Docker (Mac Recommended)
```bash
chmod +x run-dind.sh
./run-dind.sh
```
*Best for isolated environments where host-level Docker isn't ideal.*

---

## 2. 📦 INTEGRATED SERVICES (WHAT IS ADDED)

The following services are currently functional and accessible via their own ports:

-   **Main Dashboard:** `http://localhost:3069`
-   **Jellyfin:** Media & Entertainment server (`:8096`).
-   **Nextcloud:** Cloud productivity and file management (`:8081`).
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

---

## 4. 📝 PROJECT DOCUMENTATION & LOGS

Stay up to date with the development progress through our detailed logging system:

-   **Technical Logs:** All research and implementation records are located in the **`Project_S_Logs/`** directory.
-   **Static UI Preview:** Open **`Project_S_Logs/06_Dashboard_Technical_Report.html`** in any browser for a functional, high-fidelity mirror of the dashboard frontend.

---

## Contributors

- [BasilSuhail](https://github.com/BasilSuhail)
- [saadsh15](https://github.com/saadsh15)
