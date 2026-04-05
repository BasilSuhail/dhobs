# Architectural Blueprint: Authentication & Entropy Key System

## 1. Executive Summary

This blueprint adds a full authentication layer to the HomeForge Next.js 16 dashboard. The system has two pillars:

**Entropy Key (Root of Trust):** On first container start, a 64-byte cryptographically random master secret is generated. It is printed to Docker logs as a hex recovery key and stored encrypted on disk using AES-256-GCM with a PBKDF2-derived wrapping key (machine hostname + persisted UUID). All application secrets — session encryption password, WebSocket auth key — are derived from this master secret using HKDF. The entropy key can never be reconstructed from the stored files alone; the hex printed to logs is the only recovery path.

**Multi-User Auth:** Username + password auth (argon2id hashing) with two roles: `admin` and `viewer`. Users are stored in a SQLite database. The first user is created during a one-time `/setup` wizard which requires proof of the entropy key. Subsequent sessions are encrypted iron-session cookies. The WebSocket terminal is protected by short-lived HMAC-signed tickets.

**Stack additions:** `iron-session@8.0.3`, `better-sqlite3@11.9.1`, `argon2@0.43.0` (all Node.js, run server-side only).

---

## 2. Dependency Matrix

### New Runtime Dependencies (install in `Dashboard/Dashboard1/`)

| Package | Version | Purpose |
|---|---|---|
| `iron-session` | `8.0.3` | Encrypted, tamper-proof cookie sessions. Stateless — no DB needed for sessions. Password derived from entropy key. |
| `better-sqlite3` | `11.9.1` | Synchronous SQLite3 driver. Stores users table and app_state. File lives in the security data volume. |
| `argon2` | `0.43.0` | argon2id password hashing (industry standard for password storage). Async API. Native module — must be in `serverExternalPackages`. |

### New Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@types/better-sqlite3` | `7.6.12` | TypeScript types for better-sqlite3. |
| `@types/argon2` | `0.15.3` | TypeScript types for argon2. |

### Install command
```bash
cd Dashboard/Dashboard1
npm install iron-session@8.0.3 better-sqlite3@11.9.1 argon2@0.43.0
npm install -D @types/better-sqlite3@7.6.12
```

---

## 3. Data Models & Schemas

### SQLite — `homeforge.db` (at `/app/data/security/homeforge.db`)

```sql
-- Users with role-based access
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role       TEXT    NOT NULL CHECK(role IN ('admin', 'viewer')) DEFAULT 'viewer',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Key-value store for application state flags
CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Seed: setup_complete starts as '0'
-- INSERT OR IGNORE INTO app_state(key, value) VALUES ('setup_complete', '0');
```

### iron-session — `SessionData` TypeScript interface

```typescript
// lib/session.ts
interface SessionData {
  userId:   number;
  username: string;
  role:     'admin' | 'viewer';
}
```

### Encrypted Key File — `data/security/.homeforge.key` (JSON)

```json
{
  "version": 1,
  "pbkdf2Salt": "<64-char hex>",
  "iv":         "<24-char hex (12 bytes)>",
  "authTag":    "<32-char hex (16 bytes)>",
  "ciphertext": "<128-char hex (64 bytes)>"
}
```

### UUID File — `data/security/.homeforge.uuid` (plaintext)

```
<36-char UUID v4 string>
```
_This UUID is combined with the hostname as the PBKDF2 input to derive the file wrapping key._

---

## 4. System Architecture & Flow

### Boot Sequence
```
docker compose up
  → start.sh
    → node /app/scripts/bootstrap.js
        → checks if /app/data/security/.homeforge.key exists
        → [FIRST RUN]: generates entropyKey (64 bytes CSPRNG)
                        saves UUID to .homeforge.uuid
                        derives wrapKey = PBKDF2(hostname+uuid, salt, 210000, 32, sha512)
                        encrypts entropyKey → AES-256-GCM → saves .homeforge.key
                        prints "HOMEFORGE ENTROPY KEY: <hex>" to stdout (Docker logs)
        → [EXISTING]:  loads uuid from .homeforge.uuid
                        loads encrypted blob from .homeforge.key
                        derives wrapKey (same PBKDF2 formula)
                        decrypts entropyKey via AES-256-GCM
        → derives SESSION_SECRET = HKDF(entropyKey, "homeforge", "iron-session-v1", 32) → hex
        → derives WS_SECRET      = HKDF(entropyKey, "homeforge", "ws-auth-v1",      32) → hex
        → outputs to stdout: 'export SESSION_SECRET="..." \nexport WS_SECRET="..."'
    → eval $(node /app/scripts/bootstrap.js)   ← injects SESSION_SECRET + WS_SECRET into shell env
    → node /app/custom-server.js &             ← WS server reads process.env.WS_SECRET
    → exec node /app/server.js                 ← Next.js reads process.env.SESSION_SECRET
```

### First-Visit Setup Flow
```
Browser → GET /
  → Next.js middleware
    → no valid session cookie
    → redirect to /login

Browser → GET /login
  → /login page renders
  → client calls GET /api/auth/setup/status
      → DB query: SELECT value FROM app_state WHERE key='setup_complete'
      → returns { complete: false }
  → client redirects to /setup

Browser → GET /setup
  → /setup page: form with (entropyKey, username, password)
  → POST /api/auth/setup
      → verify entropyKey: decrypt .homeforge.key using wrapKey; compare bytes with input
      → if mismatch → 401
      → hash password with argon2id
      → INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')
      → UPDATE app_state SET value='1' WHERE key='setup_complete'
      → create iron-session cookie with { userId, username, role: 'admin' }
      → 200 OK
  → redirect to /
```

### Normal Login Flow
```
Browser → POST /api/auth/login { username, password }
  → SELECT * FROM users WHERE username = ?
  → argon2.verify(password_hash, password)
  → if fail → 401
  → getIronSession → session.userId = user.id, session.username, session.role
  → session.save()
  → 200 OK { role }

Browser → protected page
  → middleware reads iron-session cookie
  → decrypts with SESSION_SECRET
  → if valid → allow through, set x-user-role header
  → if invalid/missing → redirect /login
```

### WebSocket Terminal Auth Flow
```
Browser (authenticated) → GET /api/auth/ws-ticket
  → middleware already validated session
  → generate ticket: timestamp = Date.now()
  → sig = HMAC-SHA256(WS_SECRET, `${timestamp}`) → hex
  → ticket = `${timestamp}.${sig}`
  → return { ticket }

Browser → new WebSocket(`ws://host:3070?ticket=${ticket}`)

custom-server.js receives upgrade:
  → parse ticket = url.searchParams.get('ticket')
  → split on '.' → [ts, sig]
  → if Date.now() - ts > 30000 → close(4401, 'ticket expired')
  → recompute HMAC-SHA256(WS_SECRET, ts) → expectedSig
  → if sig !== expectedSig → close(4401, 'invalid ticket')
  → allow connection, spawn PTY
```

### Role-Based Access
- `admin`: full dashboard, terminal, Docker controls, user management
- `viewer`: read-only dashboard, no terminal, no Docker controls, no user management
- Viewer restrictions enforced by:
  1. Middleware attaching `x-user-role` header
  2. Server components/API routes checking `session.role`
  3. Client: role stored in session and surfaced via `/api/auth/me`

---

## 5. Directory Structure

```
Dashboard/Dashboard1/
├── scripts/
│   └── bootstrap.ts               ← NEW: entropy key generation/loading, outputs env exports
├── tsconfig.scripts.json           ← NEW: compiles bootstrap.ts → scripts/bootstrap.js (commonjs)
├── lib/
│   ├── crypto/
│   │   ├── entropy.ts              ← NEW: CSPRNG generation, HKDF derivation, AES-256-GCM encrypt/decrypt
│   │   └── keystore.ts             ← NEW: load/save encrypted key file, UUID file
│   ├── db/
│   │   ├── index.ts                ← NEW: better-sqlite3 singleton, schema init
│   │   └── users.ts                ← NEW: getUser, createUser, listUsers, deleteUser, isSetupComplete
│   ├── session.ts                  ← NEW: iron-session options (reads SESSION_SECRET from env)
│   └── auth.ts                     ← NEW: requireSession(), requireAdmin(), getSessionFromReq()
├── middleware.ts                    ← NEW: route protection, session validation, role injection
├── app/
│   ├── login/
│   │   └── page.tsx                ← NEW: login form UI
│   ├── setup/
│   │   └── page.tsx                ← NEW: first-run setup form UI (entropy key + admin account)
│   ├── (protected)/
│   │   └── layout.tsx              ← NEW: server layout that validates session + injects user context
│   ├── api/
│   │   └── auth/
│   │       ├── login/
│   │       │   └── route.ts        ← NEW: POST login
│   │       ├── logout/
│   │       │   └── route.ts        ← NEW: POST logout (clears session)
│   │       ├── me/
│   │       │   └── route.ts        ← NEW: GET current user info
│   │       ├── setup/
│   │       │   ├── route.ts        ← NEW: POST initial setup (entropy key verify + create admin)
│   │       │   └── status/
│   │       │       └── route.ts    ← NEW: GET setup completion status
│   │       ├── ws-ticket/
│   │       │   └── route.ts        ← NEW: GET short-lived WS auth ticket
│   │       └── users/
│   │           ├── route.ts        ← NEW: GET list users / POST create user (admin only)
│   │           └── [id]/
│   │               └── route.ts    ← NEW: DELETE user / PUT update role (admin only)
│   └── page.tsx                    ← MODIFY: wrap in auth check, move to (protected) route group
├── custom-server.ts                 ← MODIFY: add WS ticket verification before PTY spawn
├── start.sh                         ← MODIFY: eval bootstrap.js before starting servers
├── Dockerfile                       ← MODIFY: compile bootstrap, copy native modules
├── next.config.mjs                  ← MODIFY: add serverExternalPackages for argon2+better-sqlite3
└── docker-compose.yml               ← MODIFY: add security volume mount

data/security/                       ← NEW Docker volume path (./data/security on host)
├── .homeforge.uuid                  ← generated once
├── .homeforge.key                   ← encrypted entropy key blob
└── homeforge.db                     ← SQLite user database
```

---

## 6. Step-by-Step Implementation Guide

### Phase 1: Dependencies & Configuration

**Step 1.1** — Install new packages.
```bash
cd Dashboard/Dashboard1
npm install iron-session@8.0.3 better-sqlite3@11.9.1 argon2@0.43.0
npm install -D @types/better-sqlite3@7.6.12
```

**Step 1.2** — Add `serverExternalPackages` to `next.config.mjs` so Next.js does not try to bundle these native modules:
```js
// Dashboard/Dashboard1/next.config.mjs
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  devIndicators: false,
  serverExternalPackages: ['better-sqlite3', 'argon2'],
}
export default nextConfig
```

**Step 1.3** — Add environment variable declarations to `docker-compose.yml` (dashboard service):
```yaml
# In the dashboard service environment block, add:
environment:
  - PORT=3069
  - WS_PORT=3070
  - SECURITY_DIR=/app/data/security
  # SESSION_SECRET and WS_SECRET are injected at runtime by bootstrap.js
```
And add the security volume:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
  - ./data:/data:ro
  - ./data/security:/app/data/security   # ← ADD THIS LINE
```

**Step 1.4** — Create `tsconfig.scripts.json` for compiling the bootstrap script:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": ".",
    "rootDir": ".",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["scripts/bootstrap.ts"],
  "exclude": ["node_modules", ".next", "app", "components", "lib", "hooks", "public", "custom-server.ts"]
}
```

---

### Phase 2: Entropy Key & Cryptography Core

**Step 2.1** — Create `lib/crypto/entropy.ts`.

This module provides three pure functions using Node.js built-in `crypto`:

```typescript
// lib/crypto/entropy.ts
import { randomBytes, hkdfSync, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';

const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEYLEN     = 32;
const PBKDF2_DIGEST     = 'sha512';

/**
 * Derive a 256-bit AES wrapping key from a passphrase using PBKDF2-SHA512.
 * @param passphrase  - hostname + uuid string
 * @param salt        - 32-byte random salt (hex string)
 */
export function deriveWrappingKey(passphrase: string, salt: string): Buffer {
  return pbkdf2Sync(
    passphrase,
    Buffer.from(salt, 'hex'),
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST
  );
}

/**
 * Encrypt a plaintext Buffer using AES-256-GCM.
 * Returns { iv, authTag, ciphertext } all as hex strings.
 */
export function aesEncrypt(
  plaintext: Buffer,
  key: Buffer
): { iv: string; authTag: string; ciphertext: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv:         iv.toString('hex'),
    authTag:    authTag.toString('hex'),
    ciphertext: ct.toString('hex'),
  };
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Throws if authentication tag does not match (tamper detection).
 */
export function aesDecrypt(
  ciphertext: string,
  key: Buffer,
  iv: string,
  authTag: string
): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]);
}

/**
 * Derive a sub-key from the master entropy key using HKDF-SHA512.
 * @param entropyKey - 64-byte master secret Buffer
 * @param info       - purpose string e.g. "iron-session-v1"
 * @param length     - output key length in bytes (default 32)
 */
export function deriveSubKey(
  entropyKey: Buffer,
  info: string,
  length: number = 32
): Buffer {
  return Buffer.from(
    hkdfSync('sha512', entropyKey, 'homeforge', info, length)
  );
}

/** Generate n random bytes, returned as a Buffer. */
export function randomKey(bytes: number = 64): Buffer {
  return randomBytes(bytes);
}
```

**Step 2.2** — Create `lib/crypto/keystore.ts`.

This module handles the encrypted key file on disk:

```typescript
// lib/crypto/keystore.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs';
import { hostname } from 'os';
import { randomUUID } from 'crypto';
import { randomKey, deriveWrappingKey, aesEncrypt, aesDecrypt } from './entropy';

interface KeyFile {
  version:    number;
  pbkdf2Salt: string;
  iv:         string;
  authTag:    string;
  ciphertext: string;
}

function getSecurityDir(): string {
  return process.env.SECURITY_DIR || '/app/data/security';
}

function getUUIDPath(): string { return `${getSecurityDir()}/.homeforge.uuid`; }
function getKeyPath():  string { return `${getSecurityDir()}/.homeforge.key`; }

function ensureSecurityDir(): void {
  const dir = getSecurityDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function loadOrCreateUUID(): string {
  const path = getUUIDPath();
  if (existsSync(path)) return readFileSync(path, 'utf8').trim();
  const uuid = randomUUID();
  ensureSecurityDir();
  writeFileSync(path, uuid, { mode: 0o600 });
  return uuid;
}

/**
 * Check if entropy key file exists (i.e. whether this is first run).
 */
export function isFirstRun(): boolean {
  return !existsSync(getKeyPath());
}

/**
 * Generate, encrypt, and persist a new entropy key.
 * Returns the raw entropy key Buffer.
 * Must only be called on first run.
 */
export function generateAndStoreEntropyKey(): Buffer {
  ensureSecurityDir();
  const uuid        = loadOrCreateUUID();
  const entropyKey  = randomKey(64);
  const pbkdf2Salt  = randomKey(32).toString('hex');
  const passphrase  = hostname() + ':' + uuid;
  const wrapKey     = deriveWrappingKey(passphrase, pbkdf2Salt);
  const { iv, authTag, ciphertext } = aesEncrypt(entropyKey, wrapKey);
  const keyFile: KeyFile = { version: 1, pbkdf2Salt, iv, authTag, ciphertext };
  writeFileSync(getKeyPath(), JSON.stringify(keyFile, null, 2), { mode: 0o600 });
  chmodSync(getKeyPath(), 0o600);
  return entropyKey;
}

/**
 * Load and decrypt the entropy key from disk.
 * Throws if file is missing or decryption fails (tamper detected).
 */
export function loadEntropyKey(): Buffer {
  const path = getKeyPath();
  if (!existsSync(path)) throw new Error('Entropy key file not found. Is this the first run?');
  const keyFile: KeyFile = JSON.parse(readFileSync(path, 'utf8'));
  if (keyFile.version !== 1) throw new Error(`Unknown key file version: ${keyFile.version}`);
  const uuid       = loadOrCreateUUID();
  const passphrase = hostname() + ':' + uuid;
  const wrapKey    = deriveWrappingKey(passphrase, keyFile.pbkdf2Salt);
  return aesDecrypt(keyFile.ciphertext, wrapKey, keyFile.iv, keyFile.authTag);
}

/**
 * Verify a hex entropy key string matches the stored encrypted key.
 * Used during /setup to prove the user has the recovery key.
 */
export function verifyEntropyKey(hexInput: string): boolean {
  try {
    const stored = loadEntropyKey();
    const input  = Buffer.from(hexInput.trim(), 'hex');
    if (input.length !== 64) return false;
    // Constant-time comparison
    return stored.equals(input);
  } catch {
    return false;
  }
}
```

**Step 2.3** — Create `scripts/bootstrap.ts`.

This runs before the Next.js server starts. Outputs `export KEY="val"` lines for `eval` in `start.sh`:

```typescript
// scripts/bootstrap.ts
import { isFirstRun, generateAndStoreEntropyKey, loadEntropyKey } from '../lib/crypto/keystore';
import { deriveSubKey } from '../lib/crypto/entropy';

function main(): void {
  let entropyKey: Buffer;

  if (isFirstRun()) {
    entropyKey = generateAndStoreEntropyKey();

    // Print the recovery key clearly to Docker logs
    const separator = '='.repeat(72);
    process.stderr.write(`\n${separator}\n`);
    process.stderr.write(`  HOMEFORGE ENTROPY RECOVERY KEY (save this somewhere safe)\n`);
    process.stderr.write(`  ${entropyKey.toString('hex')}\n`);
    process.stderr.write(`  This key is printed ONCE. It is required to recover your setup.\n`);
    process.stderr.write(`${separator}\n\n`);
  } else {
    entropyKey = loadEntropyKey();
  }

  // Derive application sub-keys
  const sessionSecret = deriveSubKey(entropyKey, 'iron-session-v1', 32).toString('hex'); // 64 hex chars
  const wsSecret      = deriveSubKey(entropyKey, 'ws-auth-v1',      32).toString('hex');

  // Output shell-eval-compatible exports to stdout
  process.stdout.write(`export SESSION_SECRET="${sessionSecret}"\n`);
  process.stdout.write(`export WS_SECRET="${wsSecret}"\n`);
}

main();
```

**Step 2.4** — Update `start.sh` to eval bootstrap output:

```sh
#!/bin/sh
set -e

# Bootstrap: generate/load entropy key and inject derived secrets into env
eval $(node /app/scripts/bootstrap.js)

# Start the WebSocket terminal server in background, then Next.js in foreground
node /app/custom-server.js &
exec node /app/server.js
```

---

### Phase 3: Database Layer

**Step 3.1** — Create `lib/db/index.ts` (SQLite singleton + schema init):

```typescript
// lib/db/index.ts
import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';

const DB_DIR  = process.env.SECURITY_DIR || '/app/data/security';
const DB_PATH = path.join(DB_DIR, 'homeforge.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true, mode: 0o700 });

  _db = new Database(DB_PATH, { fileMustExist: false });
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK(role IN ('admin', 'viewer')) DEFAULT 'viewer',
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO app_state(key, value) VALUES ('setup_complete', '0');
  `);

  return _db;
}
```

**Step 3.2** — Create `lib/db/users.ts` (all user operations):

```typescript
// lib/db/users.ts
import { getDb } from './index';
import argon2 from 'argon2';

export interface User {
  id:           number;
  username:     string;
  password_hash: string;
  role:         'admin' | 'viewer';
  created_at:   number;
}

export interface PublicUser {
  id:         number;
  username:   string;
  role:       'admin' | 'viewer';
  created_at: number;
}

export async function createUser(
  username: string,
  password: string,
  role: 'admin' | 'viewer' = 'viewer'
): Promise<PublicUser> {
  const hash = await argon2.hash(password, {
    type:        argon2.argon2id,
    memoryCost:  65536,  // 64 MiB
    timeCost:    3,
    parallelism: 4,
  });
  const db   = getDb();
  const stmt = db.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  );
  const result = stmt.run(username, hash, role);
  return getUserById(result.lastInsertRowid as number)!;
}

export async function verifyUser(
  username: string,
  password: string
): Promise<PublicUser | null> {
  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  if (!user) return null;
  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) return null;
  return { id: user.id, username: user.username, role: user.role, created_at: user.created_at };
}

export function getUserById(id: number): PublicUser | null {
  const db   = getDb();
  const user = db.prepare(
    'SELECT id, username, role, created_at FROM users WHERE id = ?'
  ).get(id) as PublicUser | undefined;
  return user ?? null;
}

export function listUsers(): PublicUser[] {
  const db = getDb();
  return db.prepare(
    'SELECT id, username, role, created_at FROM users ORDER BY created_at ASC'
  ).all() as PublicUser[];
}

export function deleteUser(id: number): boolean {
  const db   = getDb();
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return info.changes > 0;
}

export function updateUserRole(id: number, role: 'admin' | 'viewer'): PublicUser | null {
  const db   = getDb();
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  return getUserById(id);
}

export function isSetupComplete(): boolean {
  const db  = getDb();
  const row = db.prepare("SELECT value FROM app_state WHERE key = 'setup_complete'").get() as
    { value: string } | undefined;
  return row?.value === '1';
}

export function markSetupComplete(): void {
  const db = getDb();
  db.prepare("UPDATE app_state SET value = '1' WHERE key = 'setup_complete'").run();
}
```

---

### Phase 4: Session & Auth Middleware

**Step 4.1** — Create `lib/session.ts`:

```typescript
// lib/session.ts
import type { IronSessionOptions } from 'iron-session';

export interface SessionData {
  userId:   number;
  username: string;
  role:     'admin' | 'viewer';
}

export const sessionOptions: IronSessionOptions = {
  password:    process.env.SESSION_SECRET as string,  // 64 hex chars = 32 bytes — set by bootstrap
  cookieName:  'homeforge_session',
  cookieOptions: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   60 * 60 * 24 * 7,  // 7 days
  },
};
```

**Step 4.2** — Create `lib/auth.ts` (server-side auth helpers):

```typescript
// lib/auth.ts
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionOptions, type SessionData } from './session';

/** Get the current session. Returns null if not authenticated. */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.userId) return null;
  return { userId: session.userId, username: session.username, role: session.role };
}

/** Get session or redirect to /login. Use in Server Components. */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

/** Require admin role or redirect to /. Use in Server Components. */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireSession();
  if (session.role !== 'admin') redirect('/');
  return session;
}
```

**Step 4.3** — Create `middleware.ts` at the root of `Dashboard/Dashboard1/`:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import type { SessionData } from '@/lib/session';

const PUBLIC_PATHS = ['/login', '/setup', '/api/auth'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow all public paths and static assets
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const session = await getIronSession<SessionData>(req, res, {
    password:   process.env.SESSION_SECRET as string,
    cookieName: 'homeforge_session',
  });

  if (!session.userId) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Attach user info as headers so Server Components can read them without re-parsing cookie
  res.headers.set('x-user-id',   String(session.userId));
  res.headers.set('x-user-role', session.role);
  res.headers.set('x-username',  session.username);

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### Phase 5: API Routes

**Step 5.1** — Create `app/api/auth/setup/status/route.ts`:

```typescript
// app/api/auth/setup/status/route.ts
import { NextResponse } from 'next/server';
import { isSetupComplete } from '@/lib/db/users';

export async function GET() {
  return NextResponse.json({ complete: isSetupComplete() });
}
```

**Step 5.2** — Create `app/api/auth/setup/route.ts`:

```typescript
// app/api/auth/setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { isSetupComplete, createUser, markSetupComplete } from '@/lib/db/users';
import { verifyEntropyKey } from '@/lib/crypto/keystore';
import { sessionOptions, type SessionData } from '@/lib/session';
import { z } from 'zod';

const SetupSchema = z.object({
  entropyKey: z.string().length(128),   // 64 bytes = 128 hex chars
  username:   z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password:   z.string().min(12),
});

export async function POST(req: NextRequest) {
  if (isSetupComplete()) {
    return NextResponse.json({ error: 'Setup already complete' }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SetupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { entropyKey, username, password } = parsed.data;

  if (!verifyEntropyKey(entropyKey)) {
    return NextResponse.json({ error: 'Invalid entropy key' }, { status: 401 });
  }

  const user = await createUser(username, password, 'admin');
  markSetupComplete();

  const res = NextResponse.json({ ok: true });
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.userId   = user.id;
  session.username = user.username;
  session.role     = 'admin';
  await session.save();

  return res;
}
```

**Step 5.3** — Create `app/api/auth/login/route.ts`:

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { verifyUser, isSetupComplete } from '@/lib/db/users';
import { sessionOptions, type SessionData } from '@/lib/session';
import { z } from 'zod';

const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  if (!isSetupComplete()) {
    return NextResponse.json({ error: 'Setup not complete' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const user = await verifyUser(parsed.data.username, parsed.data.password);
  if (!user) {
    // Constant-time-ish delay to prevent username enumeration via timing
    await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role: user.role });
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.userId   = user.id;
  session.username = user.username;
  session.role     = user.role;
  await session.save();

  return res;
}
```

**Step 5.4** — Create `app/api/auth/logout/route.ts`:

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.destroy();
  return res;
}
```

**Step 5.5** — Create `app/api/auth/me/route.ts`:

```typescript
// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ userId: session.userId, username: session.username, role: session.role });
}
```

**Step 5.6** — Create `app/api/auth/ws-ticket/route.ts`:

```typescript
// app/api/auth/ws-ticket/route.ts
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const ts  = Date.now().toString();
  const sig = createHmac('sha256', process.env.WS_SECRET as string)
    .update(ts)
    .digest('hex');

  return NextResponse.json({ ticket: `${ts}.${sig}` });
}
```

**Step 5.7** — Create `app/api/auth/users/route.ts` (admin only):

```typescript
// app/api/auth/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listUsers, createUser } from '@/lib/db/users';
import { z } from 'zod';

export async function GET() {
  await requireAdmin();
  return NextResponse.json(listUsers());
}

const CreateSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(12),
  role:     z.enum(['admin', 'viewer']),
});

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = await createUser(parsed.data.username, parsed.data.password, parsed.data.role);
  return NextResponse.json(user, { status: 201 });
}
```

**Step 5.8** — Create `app/api/auth/users/[id]/route.ts`:

```typescript
// app/api/auth/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getSession } from '@/lib/auth';
import { deleteUser, updateUserRole } from '@/lib/db/users';
import { z } from 'zod';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id }  = await params;
  const userId  = parseInt(id, 10);

  if (userId === session.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const deleted = deleteUser(userId);
  if (!deleted) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

const UpdateSchema = z.object({ role: z.enum(['admin', 'viewer']) });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body   = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  const updated = updateUserRole(parseInt(id, 10), parsed.data.role);
  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(updated);
}
```

---

### Phase 6: Frontend Pages

**Step 6.1** — Create `app/setup/page.tsx` (first-run setup UI):

```tsx
// app/setup/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ entropyKey: '', username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect away if setup already complete
  useEffect(() => {
    fetch('/api/auth/setup/status')
      .then(r => r.json())
      .then(data => { if (data.complete) router.replace('/login'); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/setup', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    if (res.ok) {
      router.replace('/');
    } else {
      const data = await res.json();
      setError(data.error || 'Setup failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '420px', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>HomeForge Initial Setup</h1>
        <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>
          Enter the entropy key printed in your Docker logs to complete setup.
        </p>
        <label>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entropy Key</span>
          <input
            type="password"
            value={form.entropyKey}
            onChange={e => setForm(f => ({ ...f, entropyKey: e.target.value }))}
            placeholder="128-character hex key from Docker logs"
            style={{ display: 'block', width: '100%', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}
            required
          />
        </label>
        <label>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Username</span>
          <input
            type="text"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            placeholder="admin"
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_-]+"
          />
        </label>
        <label>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Password</span>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="At least 12 characters"
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            required minLength={12}
          />
        </label>
        {error && <p style={{ color: 'red', fontSize: '0.875rem' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '0.75rem', fontWeight: 600 }}>
          {loading ? 'Setting up…' : 'Complete Setup'}
        </button>
      </form>
    </div>
  );
}
```

**Step 6.2** — Create `app/login/page.tsx`:

```tsx
// app/login/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/setup/status')
      .then(r => r.json())
      .then(data => { if (!data.complete) router.replace('/setup'); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    if (res.ok) {
      router.replace('/');
    } else {
      setError('Invalid username or password');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '360px', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>HomeForge</h1>
        <label>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</span>
          <input
            type="text"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            required autoComplete="username"
          />
        </label>
        <label>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            required autoComplete="current-password"
          />
        </label>
        {error && <p style={{ color: 'red', fontSize: '0.875rem' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '0.75rem', fontWeight: 600 }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
```

_Note: Both login/setup pages use inline styles intentionally — they load before the Tailwind CSS theming system and must not depend on it._

---

### Phase 7: WebSocket Terminal Auth

**Step 7.1** — Modify `custom-server.ts` to add ticket verification.

Add this function before the `wss.on('connection', ...)` block:

```typescript
// Add this import at the top:
import { createHmac, timingSafeEqual } from 'crypto';

// Add this function before wss.on('connection', ...):
function verifyWsTicket(ticket: string | null): boolean {
  if (!ticket) return false;
  const secret = process.env.WS_SECRET;
  if (!secret) return false;   // server not bootstrapped

  const dotIndex = ticket.lastIndexOf('.');
  if (dotIndex === -1) return false;

  const ts  = ticket.slice(0, dotIndex);
  const sig = ticket.slice(dotIndex + 1);

  const timestamp = parseInt(ts, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > 30_000) return false;  // 30s TTL

  const expectedSig = createHmac('sha256', secret).update(ts).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch {
    return false;
  }
}
```

At the start of the `wss.on('connection', async (ws, req) => {` handler, add:

```typescript
// First line inside wss.on('connection', ...):
const ticket = url.searchParams.get('ticket');
if (!verifyWsTicket(ticket)) {
  ws.close(4401, 'Unauthorized');
  return;
}
```

**Step 7.2** — Update the terminal client to fetch a ticket before opening the WS.

In the component that opens the terminal WebSocket (`components/dashboard/terminal-panel.tsx` or equivalent), modify the WS connection setup:

```typescript
// Before: new WebSocket(`ws://...`)
// After:
const ticketRes = await fetch('/api/auth/ws-ticket');
if (!ticketRes.ok) { /* handle auth error */ return; }
const { ticket } = await ticketRes.json();
const ws = new WebSocket(`ws://${location.hostname}:${WS_PORT}?ticket=${ticket}&shell=...`);
```

---

### Phase 8: Dockerfile Updates

**Step 8.1** — In the `builder` stage, add compilation of the bootstrap script:

```dockerfile
# After: RUN npx tsc --project tsconfig.server.json
RUN npx tsc --project tsconfig.scripts.json
```

**Step 8.2** — In the `runner` stage, copy the compiled bootstrap script:

```dockerfile
# After the custom-server.js copy:
COPY --from=builder --chown=nextjs:nodejs /app/scripts/bootstrap.js ./scripts/bootstrap.js
```

**Step 8.3** — In the `runner` stage, copy native module trees for `better-sqlite3` and `argon2`:

```dockerfile
# After the existing ws and node-pty copies:
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/bindings       ./node_modules/bindings
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/argon2         ./node_modules/argon2
```

**Step 8.4** — Ensure the `data/security` directory exists and has correct permissions. Add to the `runner` stage (before `USER nextjs`):

```dockerfile
RUN mkdir -p /app/data/security && chown nextjs:nodejs /app/data/security && chmod 700 /app/data/security
```

---

### Phase 9: Integration & Testing

**Step 9.1** — Build and start the stack:
```bash
cd /path/to/ProjectS-HomeForge
docker compose build dashboard
docker compose up dashboard
```

**Step 9.2** — Capture the entropy key from logs (first run only):
```bash
docker compose logs dashboard | grep -A 3 "HOMEFORGE ENTROPY RECOVERY KEY"
```
Copy the 128-character hex string. **Store it in a password manager.**

**Step 9.3** — Navigate to `http://localhost:3069` — you should be redirected to `/setup`. Enter the entropy key, choose an admin username and password (min 12 chars).

**Step 9.4** — After setup, you should land on the main dashboard. Confirm the session cookie `homeforge_session` exists in browser DevTools > Application > Cookies.

**Step 9.5** — Test logout: `POST /api/auth/logout` — cookie should be cleared, redirect to `/login`.

**Step 9.6** — Test terminal auth: Open terminal panel, confirm WS connection succeeds. To verify protection, stop the dashboard, manually edit `WS_SECRET` to a garbage value, restart — terminal should reject connections with close code `4401`.

**Step 9.7** — Test role restriction: Create a viewer account via `POST /api/auth/users` (admin session required). Log in as viewer. Confirm viewer cannot access `DELETE /api/auth/users/:id` (should 403).

**Step 9.8** — Test entropy key rotation (recovery path): If you need to replace a lost entropy key, the recovery procedure is:
1. Delete `data/security/.homeforge.key` and `data/security/.homeforge.uuid`
2. `docker compose restart dashboard` — a new entropy key is generated and printed to logs
3. `docker compose stop dashboard`
4. Start the container and run the bootstrap script directly to extract `SESSION_SECRET`:
   ```bash
   docker compose run --rm dashboard node /app/scripts/bootstrap.js
   ```
   (The DB and existing users are untouched — only the master secret changes. Sessions will be invalidated.)
5. Navigate to `/setup` — setup is already complete, so the wizard will skip to `/login`
