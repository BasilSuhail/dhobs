# Dashboard Internal Architecture

## Overview

The HomeForge Dashboard is a Next.js 16 application that serves as the central control plane for the entire HomeForge ecosystem. It is intentionally monolithic — all logic (auth, session management, API routes, WebSocket terminal, backup/restore, metrics) lives in one codebase.

**Tech stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Radix UI
**Runtime:** Node.js 20-slim (Docker)
**Database:** SQLCipher (AES-256-GCM encrypted SQLite) via `better-sqlite3-multiple-ciphers`
**Password hashing:** Argon2id (64 MiB memory, 3 iterations)
**Session management:** iron-session v8 (HTTP-only, signed, encrypted cookies)

## Directory Structure

```
Dashboard/Dashboard1/
├── app/
│   ├── api/
│   │   ├── auth/          # Session, login, ws-ticket, setup, admin user management
│   │   ├── backup/        # Backup/restore orchestration
│   │   ├── kiwix/         # Kiwix ZIM file browsing proxy
│   │   ├── ollama/        # Ollama model management proxy
│   │   └── stats/         # Docker container health and resource stats
│   ├── kiwix/             # Kiwix reader page
│   ├── login/             # Login page
│   ├── setup/             # One-time entropy key + admin setup
│   ├── globals.css
│   ├── layout.tsx         # Root layout with theme provider
│   └── page.tsx           # Dashboard home (module cards, metrics)
├── components/
│   ├── dashboard/         # UI components (welcome section, terminal panel, etc.)
│   ├── metrics/           # Metrics UI (resource graphs, service health)
│   └── ui/                # shadcn/ui primitives
├── hooks/                 # React hooks
├── lib/
│   ├── auth.ts            # Session guards (requireSession, requireAdmin)
│   ├── session.ts         # iron-session configuration
│   ├── rate-limit.ts      # Sliding-window rate limiter
│   ├── landing-data.ts    # Static landing page data
│   ├── utils.ts           # Shared utilities
│   ├── crypto/
│   │   ├── entropy.ts     # Mouse entropy collection + key derivation
│   │   └── keystore.ts    # SQLCipher database management
│   └── db/                # Database query layer
├── types/                 # TypeScript type definitions
├── middleware.ts           # Session guard (runs before every request)
├── custom-server.ts       # WebSocket terminal server (port 3070)
└── start.sh               # Entrypoint: runs bootstrap.js, then starts Next.js + WS server
```

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│  ┌─────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ /login   │  │ /setup   │  │ /api/*       │  │ xterm.js terminal│  │
│  │ (form)   │  │ (canvas) │  │ (fetch)      │  │ (WebSocket :3070)│  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│       │              │              │                    │             │
└───────┼──────────────┼──────────────┼────────────────────┼─────────────┘
        │              │              │                    │
        ▼              ▼              ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Next.js Middleware (middleware.ts)                                   │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 1. Check if path is public (/login, /setup, /api/auth, /_next)  │ │
│  │ 2. If not public → validate iron-session cookie                  │ │
│  │ 3. If no session → redirect to /login                            │ │
│  │ 4. If valid → inject x-user-id, x-user-role, x-username headers │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API Routes (app/api/*)                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │ /api/auth/   │ │ /api/backup/ │ │ /api/kiwix/  │ │ /api/stats/ │ │
│  │ login,       │ │ create,      │ │ browse,      │ │ containers, │ │
│  │ session,     │ │ restore,     │ │ upload       │ │ health       │ │
│  │ ws-ticket,   │ │ status       │ │              │ │              │ │
│  │ setup, users │ │              │ │              │ │              │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬──────┘ │
│         │                │                │                  │         │
└─────────┼────────────────┼────────────────┼──────────────────┼─────────┘
          │                │                │                  │
          ▼                ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Server Components (page.tsx, layouts)                                │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ requireSession() → reads iron-session cookie, redirects if none │ │
│  │ requireAdmin()   → checks session.role === 'admin', redirects   │ │
│  │ Fetches Docker stats, service health, metrics                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Business Logic (lib/)                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │ auth.ts      │ │ session.ts   │ │ rate-limit.ts│ │ keystore.ts │ │
│  │ getSession() │ │ SessionData  │ │ SlidingWindow│ │ SQLCipher   │ │
│  │ requireAdmin()│ │ options      │ │ RateLimiter  │ │ management  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────┬──────┘ │
│                                                             │         │
│  ┌──────────────────────────────┐  ┌──────────────────────┐ │         │
│  │ entropy.ts                   │  │ Docker socket API    │ │         │
│  │ HKDF key derivation          │  │ /var/run/docker.sock │ │         │
│  │ Mouse movement + CSPRNG      │  │ containers, stats    │ │         │
│  └──────────────────────────────┘  └──────────────────────┘ │         │
└─────────────────────────────────────────────────────────────────────┘
          │                                          │
          ▼                                          ▼
┌────────────────────────────────┐  ┌───────────────────────────────────┐
│  SQLCipher Database            │  │  WebSocket Terminal (:3070)       │
│  ./data/security/homeforge.db  │  │  custom-server.ts                  │
│  ┌──────────────────────────┐  │  │  ┌─────────────────────────────┐  │
│  │ users (id, username,     │  │  │  │ verifyWsTicket()            │  │
│  │ password_hash, role,     │  │  │  │ pty.spawn(bash/docker exec) │  │
│  │ created_at)              │  │  │  │ 30-min idle timeout          │  │
│  │ Encrypted: AES-256-GCM   │  │  │  │ ALLOWED_CONTAINERS whitelist │  │
│  └──────────────────────────┘  │  │  │ Ollama shell, container shell│  │
│                                │  │  │ unified bash shell           │  │
│  ┌──────────────────────────┐  │  │  └─────────────────────────────┘  │
│  │ setup state              │  │  │                                   │
│  │ (temporary UUID key      │  │  │  Connection flow:                 │  │
│  │  → PRAGMA rekey          │  │  │  1. Client fetches /api/auth/    │  │
│  │  → entropy-derived key)  │  │  │     ws-ticket (short-lived HMAC) │  │
│  └──────────────────────────┘  │  │  2. Client opens ws://:3070     │  │
│                                │  │     ?ticket={ticket}             │  │
│                                │  │  3. Server verifies ticket (30s) │  │
│                                │  │  4. Spawns PTY session           │  │
│                                │  │  5. Bidirectional data stream    │  │
│                                │  └───────────────────────────────────┘  │
└────────────────────────────────┘
```

## Authentication Chain

### Entropy Key Derivation

```
User mouse movement (frontend canvas events)
  +
CSPRNG (window.crypto.getRandomValues)
  │
  ▼
SHA-512 hash → 128-char hex entropy key
  │
  ▼
HKDF-SHA512 (three derivations, unique info strings)
  ├──→ SESSION_SECRET  (iron-session cookie encryption)
  ├──→ WS_SECRET        (WebSocket ticket HMAC-SHA256)
  └──→ DB_KEY           (SQLCipher AES-256-GCM encryption)
```

**Key properties:**
- All three secrets are derived at runtime, never stored on disk or in `.env`
- Each HomeForge installation produces cryptographically unique secrets
- Compromise of one secret does not reveal the others (HKDF independence)

### Database Rekey Flow

1. On first launch, database opens with a temporary UUID-derived key
2. User completes `/setup` wizard (mouse entropy collection)
3. `PRAGMA rekey` transitions database from temporary key to entropy-derived `DB_KEY`
4. Subsequent opens use the entropy-derived key

### Session Flow

1. User submits username + password to `/api/auth/login`
2. Argon2id hash compared against SQLCipher database
3. On success: `getIronSession()` creates encrypted cookie (`homeforge_session`)
4. Cookie is HTTP-only, signed, AES-256-GCM encrypted (iron-session v8)
5. TTL: 7 days
6. `middleware.ts` validates cookie on every request

### WebSocket Terminal Auth Flow

1. Client calls `GET /api/auth/ws-ticket` → server returns HMAC-SHA256 ticket
2. Ticket format: `{timestamp_ms}.{hmac}` — valid for 30 seconds
3. Client opens `ws://localhost:3070/?ticket={ticket}&shell={type}`
4. `custom-server.ts` verifies ticket with constant-time HMAC comparison
5. On success: spawns PTY session (bash, docker exec, or ollama shell)
6. 30-minute idle timeout closes session

## API Route Map

### /api/auth/*
| Route | Method | Auth Required | Admin Required | Purpose |
|---|---|---|---|---|
| `/api/auth/login` | POST | No | No | Authenticate user, set session |
| `/api/auth/session` | GET/DELETE | GET: No, DELETE: Yes | No | Get current session or destroy it |
| `/api/auth/ws-ticket` | GET | Yes | No | Issue short-lived WebSocket ticket |
| `/api/auth/setup` | POST | No | No | One-time entropy key + admin creation |
| `/api/auth/setup/status` | GET | No | No | Check if setup is complete |
| `/api/auth/users` | GET/POST | Yes | Yes | List users or create new user |
| `/api/auth/users/[id]` | PATCH/DELETE | Yes | Yes | Update or delete user |

### /api/backup/*
| Route | Method | Auth Required | Admin Required | Purpose |
|---|---|---|---|---|
| `/api/backup/create` | POST | Yes | Yes | Create backup archive |
| `/api/backup/restore` | POST | Yes | Yes | Restore from backup |
| `/api/backup/list` | GET | Yes | No | List available backups |
| `/api/backup/status` | GET | Yes | No | Get backup operation status |

### /api/kiwix/*
| Route | Method | Auth Required | Admin Required | Purpose |
|---|---|---|---|---|
| `/api/kiwix/library` | GET | Yes | No | List ZIM files in Kiwix library |
| `/api/kiwix/upload` | POST | Yes | Yes | Upload ZIM file |
| `/api/kiwix/delete` | POST | Yes | Yes | Delete ZIM file |

### /api/ollama/*
| Route | Method | Auth Required | Admin Required | Purpose |
|---|---|---|---|---|
| `/api/ollama/models` | GET | Yes | No | List loaded Ollama models |
| `/api/ollama/pull` | POST | Yes | Yes | Pull new model |
| `/api/ollama/delete` | POST | Yes | Yes | Delete model |

### /api/stats/*
| Route | Method | Auth Required | Admin Required | Purpose |
|---|---|---|---|---|
| `/api/stats/containers` | GET | Yes | No | List all containers with status |
| `/api/stats/health` | GET | Yes | No | Get service health from Docker |
| `/api/stats/resources` | GET | Yes | No | Get host CPU, RAM, disk usage |

## Security Boundaries

### Password Hashing
- **Algorithm:** Argon2id
- **Memory:** 64 MiB
- **Iterations:** 3
- **Parallelism:** 1
- Credentials are never stored in plaintext — only the Argon2id hash is persisted

### Rate Limiting
- **Endpoint:** `/api/auth/login`
- **Window:** 15 minutes (sliding)
- **Max attempts:** 10 per username
- **Headers:** Returns `X-RateLimit-*` headers
- **Storage:** In-memory Map (per-process)

### Container Access (WebSocket Terminal)
- **Allowlist:** 16 container names hardcoded in `custom-server.ts`
- **Shell types:** `ollama` (direct ollama shell), `container` (docker exec into named container), `null` (unified bash shell in dashboard container)
- **Idle timeout:** 30 minutes with no input
- **Ticket expiry:** 30 seconds from issuance

## Startup Sequence (start.sh)

```
1. Run bootstrap.js
   ├── Check if .env exists
   ├── If first run: generate entropy key from environment
   ├── Derive SESSION_SECRET, WS_SECRET, DB_KEY via HKDF
   ├── Export as environment variables for the process
   └── Check if setup is complete

2. Start Next.js standalone server (server.js) on $PORT (3069)
   └── Next.js handles HTTP requests, API routes, Server Components

3. Start WebSocket terminal server (custom-server.js) on $WS_PORT (3070)
   └── Handles PTY sessions, Docker exec, Ollama shell

4. Both servers run as child processes of start.sh
   └── start.sh traps SIGTERM and propagates to both children
```

## Docker Socket Access

The dashboard mounts `/var/run/docker.sock` from the host to:
- List and inspect containers (health checks, stats)
- Execute `docker exec` commands for the terminal
- Run `docker compose` commands for backup/restore

**Security note:** Full Docker socket access = root on host. The dashboard runs as `root` inside the container (required for node-pty native bindings). This is a known trade-off for simplicity — future hardening could use a Docker socket proxy with restricted API access.

## What's Not Documented Here

- UI component internals — see individual component files
- Theming system — `theme-provider.tsx`, Tailwind config
- Build process — Dockerfile, next.config.mjs
- Test suite — `__tests__/`, vitest.config.ts
