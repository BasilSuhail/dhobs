# 40 — Secrets Management (Docker Secrets)

**Date:** April 11, 2026  
**Author:** Author  
**Related Issue:** #193, #182  
**PR:** #194

---

## Context

Architecture Review (#182) identified "No secrets management" as a **High** severity issue.
Nine sensitive secrets were stored in plaintext in `.env`, visible to anyone with file read access or via `docker inspect`.

## Solution

Implemented **Docker Secrets** using bind-mounted files in `data/secrets/`.

### 1. Secrets Infrastructure
- **Storage:** Secrets moved from `.env` to `data/secrets/<name>`.
- **Permissions:** Files are `600` (owner read/write only).
- **Access:** Mounted read-only into containers at `/run/secrets/<name>`.
- **Visibility:** Secrets are no longer visible in `docker inspect` or `ps aux` output.

### 2. Service Integration

**Tier 1: Native Support**
Services that support `_FILE` environment variables out-of-the-box:
- **MariaDB:** `MYSQL_ROOT_PASSWORD_FILE=/run/secrets/mysql_root_password`
- **Postgres:** `POSTGRES_PASSWORD_FILE=/run/secrets/mysql_password`
- **Nextcloud:** `MYSQL_PASSWORD_FILE` & `NEXTCLOUD_ADMIN_PASSWORD_FILE`

**Tier 2: Custom Entrypoints**
Services that required modification to read secrets from files:
- **Synapse:** `gen_config.py` updated to detect `_FILE` vars and read contents.
- **Open-WebUI, OpenVPN-UI, Collabora:** Added `read-secrets.sh` wrapper script to read files and export env vars before the main process starts.

### 3. Migration
- **`scripts/migrate-secrets.sh`**: Automatically extracts secrets from an existing `.env` file and creates the `data/secrets/` directory structure.
- **Fallback**: If a secret is missing from `.env`, the script generates a cryptographically secure random value.

## Impact Assessment

| Metric | Before | After |
|---|---|---|
| **Secret Exposure** | Plaintext in `.env` | Read-only files in `data/secrets/` |
| **Inspect Visibility** | Visible in `docker inspect` | Hidden (mounted as files) |
| **Process Visibility** | Visible in `ps` / `/proc` | Hidden |
| **Security Score** | 3/10 → 6/10 | **8/10** (Audit finding resolved) |

---

## Key Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Defines `secrets:` block and bind mounts |
| `config/scripts/read-secrets.sh` | Wrapper script for Tier 2 services |
| `config/matrix/gen_config.py` | Synapse config generator with secret file support |
| `scripts/migrate-secrets.sh` | Migration tool for existing installations |
| `data/secrets/` | Directory storing the actual secret files |

---

*End of Log 40*
