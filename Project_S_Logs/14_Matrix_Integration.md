# Project S — Matrix Integration Log

This document records the implementation of Matrix Synapse and Element Web as the primary communications suite for Project S.

---

## 1. Overview
Matrix was chosen as a Discord replacement due to its decentralized nature, robust end-to-end encryption (E2EE) support, and mature web client (Element).

*   **Homeserver:** Matrix Synapse (Python/Twisted)
*   **Database:** PostgreSQL 15 (dedicated instance)
*   **Web Client:** Element Web
*   **Domain:** `homeforge.local`

## 2. Infrastructure Configuration

### Service Ports
| Service | Internal Port | External Port | Description |
| :--- | :--- | :--- | :--- |
| Synapse | 8008 | 8008 | Client/Server API & Federation |
| Element | 80 | 8082 | Web Interface |
| PostgreSQL | 5432 | N/A | Dedicated database for Synapse |

### Data Persistence
*   **Database:** `./dind-data/matrix/db`
*   **Synapse Media & Config:** `./dind-data/matrix/synapse`

## 3. Configuration Details

### Synapse (`homeserver.yaml`)
*   **Registration:** Enabled by default (`enable_registration: true`).
*   **Verification:** Disabled for initial setup (`enable_registration_without_verification: true`).
*   **Database:** Configured to use the `psycopg2` driver connecting to the `synapse-db` container.

### Element (`element-config.json`)
*   Custom configuration applied to point the default homeserver to `http://192.168.1.68:8008`.
*   Branding updated to "HomeForge Matrix".

## 4. User Management

### Registration
Users can register directly from the Element login screen.

### Administrative Tasks
To promote a user to administrator, run the following command within the master container:
```bash
docker exec -it project-s-matrix-server register_new_matrix_user -c /data/homeserver.yaml http://localhost:8008
```

## 5. Troubleshooting & Logs

### View Logs
*   **Synapse:** `docker logs project-s-matrix-server`
*   **Element:** `docker logs project-s-matrix-client`

### Common Issues
1.  **Permission Denied on `/data`:** Fixed by setting ownership to UID 991 (default synapse user) during the generation phase.
2.  **Database Connection Refused:** Ensure `synapse-db` is healthy before starting Synapse.

---
*Saad Shafique (@saadsh15)*
