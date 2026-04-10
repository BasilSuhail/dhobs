# ADR-0006: Flat Data Volume Structure Under ./data/

**Status:** Accepted (documenting current reality)
**Date:** 2026-04-10

## Context

Each HomeForge service needs persistent storage. We chose a flat `./data/<service-name>/` structure on the host filesystem.

## Decision

All service data lives under a single `./data/` directory on the host, with one subdirectory per service.

## Rationale

1. **Simple to understand** — one directory, all your data
2. **Simple to back up** — archive `./data/` and you have everything
3. **Simple to migrate** — copy the directory, everything works
4. **No complex volume management** — bind mounts instead of Docker named volumes
5. **Dashboard metrics** — mounts `./data` read-only to collect metrics across all services

## Data Hierarchy

```
data/
├── jellyfin/config/       # Jellyfin configuration
├── jellyfin/cache/        # Transcoded media cache
├── nextcloud/html/        # Nextcloud web root
├── nextcloud/data/        # User files (Nextcloud data dir)
├── nextcloud/db/          # MariaDB database files
├── matrix/db/             # Postgres data (Synapse DB volume)
├── matrix/synapse/        # Synapse homeserver data
├── vaultwarden/           # Password vault data
├── open-webui/            # Open-WebUI backend data
├── ollama/                # LLM models
├── kiwix/                 # ZIM files + library.xml
├── vpn/                   # OpenVPN config, certs, PKI
├── workspace/             # Shared workspace (Theia IDE)
├── filebrowser/           # Kiwix manager database
├── security/              # Dashboard entropy-encrypted user DB
└── backups/               # User-initiated backups
```

## Consequences

**Positive:**
- All data in one place — easy backup, easy understanding
- Dashboard can mount `./data` read-only for cross-service metrics
- Backup system depends on this simple structure
- Users can browse their data without Docker commands

**Negative:**
- No separation between config, state, and user data within each service directory
- Flat structure does not scale well if services add nested directories
- Backup system must be aware of which directories to include/exclude

## Future

Consider a documented contract that separates:
- `data/*/config/` — service configuration (backup: yes)
- `data/*/state/` — service state, caches (backup: no)
- `data/*/user-data/` — user files (backup: yes)
