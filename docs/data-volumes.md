# HomeForge Data Volume Structure

This document is the authoritative reference for all persistent data under `./data/`. Every directory is documented with its purpose, owner, mount type, and backup inclusion status.

## Hierarchy

```
data/
├── jellyfin/
│   ├── config/          # Jellyfin server configuration
│   └── cache/           # Transcoded media cache (disposable)
├── media/               # User media files (movies, music, photos)
├── nextcloud/
│   ├── html/            # Nextcloud web root (auto-populated on first start)
│   ├── data/            # User files synced via Nextcloud
│   └── db/              # MariaDB database (Nextcloud state)
├── matrix/
│   ├── db/              # Postgres database (Synapse state)
│   └── synapse/         # Synapse homeserver data (signing keys, media store)
├── vaultwarden/         # Password vault (SQLite DB, attachments, icons)
├── open-webui/          # AI chat backend (user accounts, chat history, settings)
├── ollama/              # Downloaded LLM models
├── kiwix/               # ZIM files (offline knowledge bases)
├── vpn/                 # OpenVPN configuration, certificates, PKI
│   ├── db/              # OpenVPN UI database
│   └── pki/             # Easy-RSA public key infrastructure
├── workspace/           # Shared workspace (Theia IDE projects)
├── filebrowser/         # Kiwix ZIM file manager database
├── security/            # Dashboard entropy-encrypted user database (homeforge.db)
└── backups/             # User-initiated backup archives (.tar.gz)
```

## Service Data Reference

### Jellyfin (`data/jellyfin/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `config/` | Server config, user accounts, library metadata | Jellyfin | jellyfin (rw) | 10–100 MB | Yes |
| `cache/` | Transcoded media thumbnails, temp files | Jellyfin | jellyfin (rw) | 100 MB – 10 GB | No (disposable) |

**Note:** `cache/` is fully regenerable. Safe to delete to reclaim space.

### Media (`data/media/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `media/` | User media library (movies, music, photos) | User | jellyfin (ro) | User-defined | No (user-managed) |

**Note:** This directory is owned and managed by the user. Too large for automated backup. Mount as read-only for Jellyfin.

### Nextcloud (`data/nextcloud/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `html/` | Nextcloud web root (PHP app files) | Nextcloud | nextcloud (rw) | 200–400 MB | Yes |
| `data/` | User files (documents, photos, synced via Nextcloud) | User | nextcloud (rw) | User-defined | No (user-managed) |
| `db/` | MariaDB database files (Nextcloud state, app config) | MariaDB | db (rw) | 100 MB – 5 GB | Yes |

**Note:** `data/` (user files) is excluded from automated backup due to potentially large size. Back up separately if needed.

### Matrix (`data/matrix/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `db/` | Postgres database (Synapse state: rooms, users, messages) | Postgres | synapse-db (rw) | 100 MB – 5 GB | Yes |
| `synapse/` | Homeserver config, signing keys, media uploads, log config | Synapse | synapse (rw) | 10–500 MB | Yes |

**Note:** The signing keys in `synapse/` are critical — losing them makes your Matrix server unreachable by federation peers. Always back up this directory.

### Vaultwarden (`data/vaultwarden/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `vaultwarden/` | SQLite DB, user attachments, icons, config | Vaultwarden | vaultwarden (rw) | 1–100 MB | Yes |

**Note:** This is your entire password vault. Losing this means losing all stored credentials. High priority for backup.

### Open-WebUI (`data/open-webui/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `open-webui/` | User accounts, chat history, settings, API keys | Open-WebUI | open-webui (rw) | 1–50 MB | Yes |

### Ollama (`data/ollama/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `ollama/` | Downloaded LLM models (weights, manifests) | Ollama | ollama (rw) | 1–50 GB | No (re-downloadable) |

**Note:** Models can be re-downloaded. Excluded from backup due to large size. Track which models are installed via Open-WebUI.

### Kiwix (`data/kiwix/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `kiwix/` | ZIM files (offline Wikipedia, etc.), library.xml | Kiwix | kiwix (rw) | 1–100 GB | No (user-managed) |

**Note:** ZIM files are large. Managed by user. Excluded from automated backup.

### VPN (`data/vpn/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `vpn/` | OpenVPN server config, client profiles | OpenVPN | openvpn (rw) | 1–10 MB | Yes |
| `vpn/db/` | OpenVPN UI database | OpenVPN UI | openvpn-ui (rw) | < 1 MB | Yes |
| `vpn/pki/` | Easy-RSA PKI (certificates, keys, CRLs) | OpenVPN | openvpn (rw) | 1–10 MB | Yes |

**Note:** The PKI directory contains all certificates and keys. Losing this means regenerating the entire CA and revoking all client profiles.

### Workspace (`data/workspace/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `workspace/` | Shared development workspace (Theia IDE projects) | User | theia (rw) | User-defined | No (user-managed) |

**Note:** This is user development data. Excluded from automated backup.

### Filebrowser (`data/filebrowser/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `filebrowser/database.db` | File browser config and state | Kiwix Manager | kiwix-manager (rw) | < 1 MB | Yes |

### Security (`data/security/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `security/` | Dashboard user database (SQLCipher encrypted) | Dashboard | dashboard (rw) | < 1 MB | Yes |

**Note:** This is encrypted with the entropy key derived during setup. Without the entropy key, this file is unrecoverable. Highest backup priority.

### Backups (`data/backups/`)

| Directory | Purpose | Owned By | Mounted By | Size Expectation | Backup? |
|---|---|---|---|---|---|
| `backups/` | User-initiated backup archives (.tar.gz) | Dashboard | dashboard (rw) | Variable | No (these ARE the backups) |

## Backup System

The automated backup system (`app/api/backup/route.ts`) creates a `.tar.gz` archive of the entire `data/` directory.

### What's Included

Everything under `data/` **except**:
- `data/backups/` — prevents recursive inclusion of old backups
- `node_modules/` — dependencies are rebuildable
- `.git/` — repo history is on GitHub
- `.next/` — build output is rebuildable
- `*.log` — transient logs, not user data
- `tmp/` — temporary files

### What's Excluded (and why)

| Excluded | Reason |
|---|---|
| `data/backups/` | Recursive prevention |
| `data/media/` | User-managed, potentially terabytes |
| `data/nextcloud/data/` | User files, potentially large |
| `data/kiwix/` | ZIM files are large, user-managed |
| `data/ollama/` | Models are re-downloadable |
| `data/workspace/` | User development data, user-managed |

**Note:** The current tar command uses broad `--exclude` flags. It does NOT exclude user-managed directories like `media/`, `nextcloud/data/`, `kiwix/`, or `ollama/`. This is a known issue — large user data directories get included in backups. The backup archive can become very large.

### Backup Archive Location

`/data/backups/homeforge-backup-<timestamp>.tar.gz`

### Backup History

Tracked in the dashboard's SQLCipher database (`data/security/homeforge.db`) in the `backup_history` table. Records filename, size, status, and creation timestamp.

## Mount Types

### Read-Write (rw) — Service can modify data
All service data directories are mounted read-write by their respective containers.

### Read-Only (ro) — Service can only read
| Directory | Mounted By | Reason |
|---|---|---|
| `data/` (entire tree) | dashboard | Metrics collection — dashboard monitors all service data without modifying it |
| `config/nginx/nginx.conf` | nginx | Config should not be modified at runtime |
| `config/nextcloud/*.sh` | nextcloud | Setup scripts are read-only |
| `config/collabora/*.xml` | collabora | Config override is read-only |
| `config/matrix/` | synapse | Config is generated at startup, not modified at runtime |
| `config/ollama/` | ollama | Modelfiles are read-only |
| `config/terminal/homelab-shell` | theia | Shell wrapper script is read-only |
| `/var/run/docker.sock` | dashboard, theia, openvpn-ui | Docker API access (ro for openvpn-ui) |

## Ownership

Each service "owns" its data directory. No service should modify another service's data.

| Service | Owns |
|---|---|
| Jellyfin | `data/jellyfin/` |
| Nextcloud | `data/nextcloud/` |
| MariaDB | `data/nextcloud/db/` |
| Synapse | `data/matrix/` |
| Postgres | `data/matrix/db/` |
| Vaultwarden | `data/vaultwarden/` |
| Open-WebUI | `data/open-webui/` |
| Ollama | `data/ollama/` |
| Kiwix | `data/kiwix/` |
| OpenVPN | `data/vpn/` |
| OpenVPN UI | `data/vpn/db/` |
| Theia IDE | `data/workspace/` |
| Kiwix Manager | `data/filebrowser/` |
| Dashboard | `data/security/`, `data/backups/` |

## Critical Data (Must Never Lose)

| Path | Why It's Critical |
|---|---|
| `data/security/homeforge.db` | Encrypted user database — without entropy key, this is unrecoverable |
| `data/vaultwarden/` | All user passwords and credentials |
| `data/matrix/synapse/` | Federation signing keys |
| `data/vpn/pki/` | CA certificates and keys for VPN |
| `data/nextcloud/db/` | All Nextcloud state (users, files metadata, app config) |
| `data/matrix/db/` | All Matrix messages, rooms, user accounts |
