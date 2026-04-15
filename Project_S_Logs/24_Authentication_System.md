# Log 24 — Authentication System Technical Documentation

**Date:** April 9, 2026  
**Author:** Author + Qwen-Coder  
**Issue:** #107 — Multi-User Authentication & Entropy-Based Application Encryption  
**Status:** Implemented in PR #119 (merged). This document provides the technical reference.

---

## Overview

Project S (HomeForge) implements an encryption-first authentication system where a single entropy-derived key protects the entire application stack — database encryption, session cookies, and WebSocket tickets. No hardcoded secrets, no `.env` secrets, no cloud identity provider.

### Architecture in One Diagram

```
Mouse Movement + CSPRNG
         │
         ▼
   SHA-512 Hash (128-char hex key)
         │
         ▼
   HKDF-SHA512 (Key Derivation Function)
    ├──► SESSION_SECRET → iron-session v8 cookies
    ├──► WS_SECRET      → WebSocket ticket HMAC-SHA256
    └──► DB_KEY         → SQLCipher database encryption (AES-256-GCM)
```

---

## 1. Entropy Key Generation

### 1.1 Capture Flow

The first time the dashboard is accessed, the browser redirects to `/setup`. The user moves their mouse over a canvas element for approximately 10 seconds.

**Client-side (`/setup` page):**
- `crypto.getRandomValues()` (CSPRNG) generates initial entropy
- Mouse movement coordinates (`clientX`, `clientY`) are collected at ~60fps
- All values are concatenated and hashed via `crypto.subtle.digest('SHA-512', data)`
- Result: a 128-character hex string

**Security properties:**
- Mouse movements add user-specific randomness that is unpredictable even to the server
- The SHA-512 hash is irreversible — even if the hash is leaked, mouse movements cannot be reconstructed
- The key is never sent over the network in plaintext during generation

### 1.2 Server-Side Storage

On form submission, the setup endpoint:

1. Receives the entropy key from the browser
2. Stores it AES-256-GCM encrypted on disk at `data/security/.homeforge.key`
3. Derives three sub-keys via HKDF-SHA512:
   - `SESSION_SECRET` — for iron-session cookies
   - `WS_SECRET` — for WebSocket terminal tickets
   - `DB_KEY` — for SQLCipher database encryption

**Key derivation code (pseudocode):**
```typescript
import { hkdf } from '@noble/hashes/hkdf'
import { sha512 } from '@noble/hashes/sha512'

const entropyKey = /* 128-char hex from browser */
const info = Buffer.from('homeforge-key-derivation')
const salt = Buffer.from('homeforge-salt-v1')

const derived = hkdf(sha512, hexToBytes(entropyKey), salt, info, 96) // 3 × 32 bytes
const SESSION_SECRET = bytesToHex(derived.slice(0, 32))
const WS_SECRET      = bytesToHex(derived.slice(32, 64))
const DB_KEY         = bytesToHex(derived.slice(64, 96))
```

### 1.3 Pre/Post Setup Rekey

Before the setup wizard runs, the database is opened with a temporary UUID-derived key (`homeforge.db`). After the admin creates their account and the entropy key is stored, `PRAGMA rekey` transitions the database from the temporary key to the entropy-derived `DB_KEY`. This ensures the database is always encrypted, even during first boot.

---

## 2. Database — SQLCipher Encrypted SQLite

### 2.1 Schema

**Table: `users`**
| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `username` | TEXT | UNIQUE NOT NULL COLLATE NOCASE |
| `password_hash` | TEXT | NOT NULL |
| `role` | TEXT | NOT NULL CHECK(role IN ('admin', 'viewer')) |
| `created_at` | INTEGER | NOT NULL DEFAULT (unixepoch()) |

**Table: `app_state`**
| Column | Type | Constraints |
|---|---|---|
| `key` | TEXT | PRIMARY KEY |
| `value` | TEXT | NOT NULL |

Used for `setup_complete` flag (`'0'` or `'1'`).

**Table: `metrics_history`** (added in Phase 3)
| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `created_at` | INTEGER | NOT NULL DEFAULT (unixepoch()) |
| `cpu` | REAL | — |
| `memory` | REAL | — |
| `gpu` | REAL | — |
| `disk` | REAL | — |
| `net_down` | REAL | — |
| `net_up` | REAL | — |

Auto-cleanup: `DELETE FROM metrics_history WHERE created_at < unixepoch() - 86400` (24h TTL).

### 2.2 Encryption at Rest

The database is opened via `better-sqlite3-multiple-ciphers`:

```typescript
_db = new Database(DB_PATH, { fileMustExist: false })
_db.pragma(`key = "x'${DB_KEY}'"`)  // Raw 256-bit hex key — SQLCipher uses directly
_db.pragma('journal_mode = WAL')
_db.pragma('foreign_keys = ON')
```

The `DB_KEY` is never stored in `.env`. It is derived at startup from the entropy key file.

---

## 3. Password Hashing — Argon2id

Passwords are never stored in plaintext. Hashing parameters:

| Parameter | Value |
|---|---|
| Algorithm | Argon2id |
| Memory cost | 65,536 (64 MiB) |
| Time cost | 3 iterations |
| Parallelism | 4 threads |

```typescript
const ARGON2_OPTIONS = {
  type:        argon2.argon2id,
  memoryCost:  65536,
  timeCost:    3,
  parallelism: 4,
}

const hash = await argon2.hash(password, ARGON2_OPTIONS)
const valid = await argon2.verify(hash, password)
```

---

## 4. Session Management — iron-session v8

### 4.1 Cookie Configuration

| Property | Value |
|---|---|
| Cookie name | `homeforge_session` |
| HTTP-only | `true` (not accessible via JavaScript) |
| Secure | `true` in production, `false` in local dev |
| SameSite | `lax` |
| TTL | 7 days (604,800 seconds) |

```typescript
export const sessionOptions: SessionOptions = {
  get password(): string {
    return process.env.SESSION_SECRET  // Derived from entropy key at runtime
  },
  cookieName: 'homeforge_session',
  ttl:        60 * 60 * 24 * 7,
  cookieOptions: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}
```

### 4.2 Session Data

Each session contains:

```typescript
interface SessionData {
  userId:   number       // Database user ID
  username: string       // Username for display
  role:     'admin' | 'viewer'
}
```

The session is encrypted via iron-session (Iron + HMAC-SHA-256) and stored as a single HTTP-only cookie. No server-side session store is required.

### 4.3 Auth Middleware

Three guard functions protect routes:

| Function | Behavior |
|---|---|
| `getSession()` | Returns session data or `null`. Use in Server Components and Route Handlers. |
| `requireSession()` | Returns session data or redirects to `/login`. Use on any protected page. |
| `requireAdmin()` | Returns session data, redirects to `/login` if unauthenticated, redirects to `/` if role ≠ `admin`. Use on admin-only routes. |

---

## 5. API Routes

### 5.1 Login — `POST /api/auth/login`

1. Receives `{ username, password }`
2. Calls `verifyUser(username, password)` — Argon2id check against SQLCipher DB
3. If valid: creates iron-session cookie with user data
4. Rate limited: 10 attempts per username per 15 minutes (sliding window)
5. Returns `X-RateLimit-*` headers

### 5.2 Logout — `POST /api/auth/logout`

Destroys the iron-session cookie.

### 5.3 Current User — `GET /api/auth/me`

Returns the current session's public user data (id, username, role, created_at). Protected by `requireSession()`.

### 5.4 User Management — `GET /api/auth/users`, `POST /api/auth/users`

Admin-only. Create, list, and manage users. Protected by `requireAdmin()`.

### 5.5 WebSocket Ticket — `GET /api/auth/ws-ticket`

Generates a short-lived HMAC-SHA256 ticket for terminal WebSocket connections. Tickets expire after 30 seconds. Prevents unauthorized WebSocket access.

---

## 6. Role-Based Access Control (RBAC)

Two roles exist:

| Role | Capabilities |
|---|---|
| `admin` | Full access: manage users, view metrics, access terminal, all integrated services |
| `viewer` | Read-only: view dashboard, view metrics. No terminal access, no user management |

**Enforcement points:**
- `requireAdmin()` guards all `/api/auth/users` routes
- Terminal WebSocket endpoint checks role before granting PTY access
- Container allowlist in WebSocket terminal restricts accessible containers

---

## 7. Rate Limiting

A sliding-window rate limiter protects the login endpoint:

| Parameter | Value |
|---|---|
| Window | 15 minutes |
| Max attempts | 10 per username |
| Response headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |

The limiter uses an in-memory `Map<username, number[]>` of request timestamps.

---

## 8. Key Files

| File | Purpose |
|---|---|
| `lib/auth.ts` | `getSession()`, `requireSession()`, `requireAdmin()` |
| `lib/session.ts` | iron-session v8 configuration, `SessionData` interface |
| `lib/db/index.ts` | SQLCipher database initialization, key application, `rekeyDatabase()` |
| `lib/db/users.ts` | User CRUD, `createUser()`, `verifyUser()`, Argon2id hashing |
| `app/api/auth/login/route.ts` | Login endpoint with rate limiting |
| `app/api/auth/logout/route.ts` | Logout endpoint |
| `app/api/auth/setup/route.ts` | First-run setup — entropy key storage, admin creation, DB rekey |
| `app/api/auth/me/route.ts` | Current user info |
| `app/api/auth/users/route.ts` | User management (admin only) |
| `app/api/auth/ws-ticket/route.ts` | WebSocket ticket generation |
| `components/auth/setup-wizard.tsx` | Mouse entropy canvas, admin creation form |
| `components/auth/login-form.tsx` | Login page form |
| `middleware.ts` | Next.js middleware — redirects to `/login` if unauthenticated |

---

## 9. Security Checklist

- [x] Passwords hashed with Argon2id (64 MiB, 3 iterations)
- [x] Database encrypted at rest via SQLCipher (AES-256-GCM)
- [x] Session cookies encrypted via iron-session, HTTP-only, SameSite lax
- [x] Entropy key derived from mouse movement + CSPRNG, never transmitted in plaintext
- [x] Three sub-keys derived via HKDF-SHA512 — one key compromise doesn't break others
- [x] WebSocket tickets expire after 30 seconds
- [x] Rate limiting on login (10 attempts / 15 min)
- [x] RBAC enforced at route level (`requireAdmin()`)
- [x] No hardcoded secrets in `.env` or source code
- [x] Config files excluded from git (`.gitignore` includes `data/security/*`)

---

## 10. Recovery Procedure

If the entropy key is lost:
1. The database cannot be opened — it is encrypted with the lost key
2. Delete `data/security/.homeforge.key` and `data/security/homeforge.db`
3. Restart the dashboard — redirects to `/setup` for fresh entropy key + admin creation
4. All user data is lost — no recovery without the key

**This is by design.** The system is encryption-first: if the key is gone, the data is inaccessible.

---

*End of Log 24*
