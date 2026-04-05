# CYBERCHECK Security Audit Report
**Project:** HomeForge Dashboard  
**Date:** 2026-04-04  
**Auditor:** Claude Code /cybercheck + /cybersecure  
**Status:** Fully remediated — all 9 findings patched (63/63 tests passing)

---

## 1. Executive Summary

HomeForge is a self-hosted server dashboard built on Next.js 16 with a custom WebSocket terminal server, iron-session authentication, argon2id password hashing, and an AES-256-GCM encrypted entropy key system. The cryptographic foundations and authentication core are strong. However, the audit identified **4 critical unauthenticated API routes**, **1 weak login validation**, **2 high-severity WebSocket hardening gaps**, and **2 medium findings**.

All critical and high findings have been **patched and verified** (60/60 tests passing post-fix).

---

## 2. Project Profile

| Category | Technology |
|---|---|
| Framework | Next.js 16.2.0 (App Router, standalone output) |
| Runtime | Node.js 20, Docker container |
| Authentication | iron-session v8 (AES-256-CBC encrypted cookies) |
| Password Hashing | argon2id — 64 MiB memory, 3 iterations, parallelism 4 |
| Database | SQLite via better-sqlite3 v11.9.1 |
| Input Validation | Zod v3.24.1 |
| WebSocket Terminal | ws v8.18.0 + node-pty |
| Key Management | PBKDF2-SHA512 + AES-256-GCM + HKDF-SHA512 |
| Deployment | Docker Compose, multi-stage Dockerfile |

---

## 3. Audit Methodology

All API route handlers, middleware, authentication libraries, cryptographic modules, the WebSocket server, and frontend pages were reviewed via static code analysis. Tests were executed against the live route handlers using Vitest with direct handler invocation (no HTTP server required). The following attack vectors were evaluated:

- Unauthenticated access to protected resources (IDOR / broken access control)
- Brute force and credential stuffing (rate limiting, password policy)
- Input injection — SQL injection, command injection, shell argument injection
- Cross-Site Request Forgery (CSRF)
- Session security (cookie flags, secret strength, timing attacks)
- WebSocket hijacking and resource exhaustion
- Cryptographic key management weaknesses
- Dependency vulnerabilities (`npm audit`)
- Secrets hardcoded in source or leaked via error messages
- Container security (user privileges, Docker socket exposure)

---

## 4. Vulnerabilities Found

### CRITICAL-1 — Unauthenticated Infrastructure API Routes

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Status** | ✅ Fixed |
| **Routes** | `GET /api/stats`, `GET /api/kiwix`, `POST /api/kiwix/restart`, `GET /api/ollama` |
| **Files** | `app/api/stats/route.ts:19`, `app/api/kiwix/route.ts:7`, `app/api/kiwix/restart/route.ts:4`, `app/api/ollama/route.ts:11` |

**Description:** All four infrastructure routes had zero authentication guards. Any unauthenticated HTTP client with network access to port 3069 could:
- `/api/stats` — read CPU, memory, network I/O, and disk usage for every container
- `/api/kiwix` — enumerate offline content library files
- `/api/kiwix/restart` — **restart a running container** via the Docker socket (privileged operation)
- `/api/ollama` — enumerate AI model names and availability

The `/api/kiwix/restart` endpoint is particularly severe: it performs a privileged Docker operation (container restart) with no identity check whatsoever.

**Fix applied:**
```typescript
// app/api/stats/route.ts, app/api/kiwix/route.ts, app/api/ollama/route.ts
import { requireSession } from '@/lib/auth'
export async function GET() {
  await requireSession()  // redirects to /login if no valid session
  // ...
}

// app/api/kiwix/restart/route.ts
import { requireAdmin } from '@/lib/auth'
export async function POST() {
  await requireAdmin()  // requires admin role; viewers cannot restart containers
  // ...
}
```

---

### HIGH-1 — Login Accepts Any Password Length (1 character minimum)

| Field | Detail |
|---|---|
| **Severity** | High |
| **Status** | ✅ Fixed |
| **File** | `app/api/auth/login/route.ts:9` |

**Description:** The `LoginSchema` enforced only `password: z.string().min(1)`, while the setup wizard requires 12 characters. This asymmetry allowed an account with a 1-character password to be created via a direct API call (if the admin created it via `POST /api/auth/users` — which also had the correct 12-char minimum). The real risk is future developer error or a bypass of client-side validation passing a trivially short password.

**Fix applied:**
```typescript
const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(12),  // aligned with setup and user creation policy
})
```

---

### HIGH-2 — Unvalidated Container Name Passed to `docker exec`

| Field | Detail |
|---|---|
| **Severity** | High |
| **Status** | ✅ Fixed |
| **File** | `custom-server.ts:102` |

**Description:** The `container` query parameter was passed directly to `docker exec -it {containerName} /bin/sh` without validation against an allowlist. While `encodeURIComponent()` on the client prevents most injection via the browser, a direct WebSocket connection (with a valid ticket) could supply an arbitrary container name — including containers outside the HomeForge project, or specially crafted names. Node-pty then spawns the shell in that container.

**Fix applied:**
```typescript
const ALLOWED_CONTAINERS = new Set([
  'project-s-jellyfin', 'project-s-nextcloud', 'project-s-ollama',
  'project-s-kiwix-reader', 'project-s-collabora',
  'project-s-vaultwarden', 'project-s-dashboard',
])

if (shellType === 'container' && (!containerName || !ALLOWED_CONTAINERS.has(containerName))) {
  ws.close(4400, 'Container not allowed')
  return
}
```

---

### HIGH-3 — No Idle Timeout on WebSocket PTY Sessions

| Field | Detail |
|---|---|
| **Severity** | High |
| **Status** | ✅ Fixed |
| **File** | `custom-server.ts:152` |

**Description:** PTY sessions (shell processes) were kept alive indefinitely once a WebSocket connection was established. An authenticated user who abandons a terminal tab leaves a live shell process running in the container. In aggregate, this constitutes a resource exhaustion vector and increases the blast radius of a compromised session.

**Fix applied:**
```typescript
const IDLE_TIMEOUT_MS = 30 * 60 * 1000  // 30 minutes

let idleTimer = setTimeout(() => ws.close(4408, 'Session idle timeout'), IDLE_TIMEOUT_MS)

ws.on('message', () => {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => ws.close(4408, 'Session idle timeout'), IDLE_TIMEOUT_MS)
})

const cleanup = () => {
  clearTimeout(idleTimer)
  // ...kill pty...
}
```

---

### MEDIUM-1 — `shell` Query Parameter Not Validated Against Enum

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Status** | ✅ Fixed |
| **File** | `custom-server.ts:83` |

**Description:** The `shell` parameter accepted any string. Only `'ollama'` and `'container'` were handled explicitly; anything else fell through to the unified shell path. An attacker with a valid ticket could pass an unexpected value and reach a code path that was never designed to handle it.

**Fix applied:**
```typescript
const VALID_SHELL_TYPES = new Set(['ollama', 'container', null])

if (!VALID_SHELL_TYPES.has(shellType)) {
  ws.close(4400, 'Invalid shell type')
  return
}
```

---

### MEDIUM-2 — No Rate Limiting on Authentication Endpoints

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Status** | ⚠️ Not patched (requires infrastructure decision) |
| **Files** | `app/api/auth/login/route.ts`, `middleware.ts` |

**Description:** `POST /api/auth/login` has no rate limiting. A network-accessible attacker can attempt unlimited password guesses. The random 200-300ms delay mitigates timing enumeration but not volume-based brute force.

**Fix applied (`/cybersecure`):** Sliding-window rate limiter in `lib/rate-limit.ts`, keyed by **username** (not IP — there is no reverse proxy, so IP is unreliable). 10 attempts per 15-minute window per account. Setup endpoint also protected with 5 attempts per hour. `X-RateLimit-*` and `Retry-After` headers emitted on every response.

---

## 5. Positive Security Findings

| Finding | Assessment |
|---|---|
| Argon2id with 64 MiB / 3 iterations / parallelism 4 | ✅ Exceeds OWASP 2024 minimums |
| AES-256-GCM for entropy key at rest | ✅ Authenticated encryption; tamper-detectable |
| PBKDF2-SHA512 at 210,000 iterations for wrapping key | ✅ OWASP-compliant |
| HKDF-SHA512 for sub-key derivation | ✅ Correct key separation |
| iron-session cookies: `httpOnly`, `secure`, `sameSite: lax` | ✅ All three flags correct |
| Timing attack mitigation on login failure | ✅ 200-300ms random delay |
| Generic error messages (`"Invalid credentials"`) | ✅ No username enumeration |
| All DB queries use parameterized statements | ✅ No SQL injection surface |
| One-time setup gate (`isSetupComplete()`) | ✅ Cannot re-run setup after completion |
| WebSocket HMAC-SHA256 tickets with 30s TTL | ✅ Short-lived, signed, constant-time comparison |
| Zod validation on all API inputs | ✅ Runtime schema enforcement |
| Non-root container user (`nextjs:1001`) | ✅ Principle of least privilege |
| Security directory permissions (`0o700` / `0o600`) | ✅ Key material protected from other processes |
| `dangerouslySetInnerHTML` usage | ✅ Hard-coded only; no user input involved |
| No secrets in source code or environment defaults | ✅ All secrets runtime-injected by bootstrap |

---

## 6. Remediation Summary

| # | Severity | Finding | Status |
|---|---|---|---|
| C-1 | 🔴 Critical | Unauthenticated `/api/stats` | ✅ Fixed |
| C-2 | 🔴 Critical | Unauthenticated `/api/kiwix` | ✅ Fixed |
| C-3 | 🔴 Critical | Unauthenticated `/api/kiwix/restart` (privileged) | ✅ Fixed |
| C-4 | 🔴 Critical | Unauthenticated `/api/ollama` | ✅ Fixed |
| H-1 | 🟠 High | Login password minimum 1 char | ✅ Fixed |
| H-2 | 🟠 High | Unvalidated container name in `docker exec` | ✅ Fixed |
| H-3 | 🟠 High | No PTY session idle timeout | ✅ Fixed |
| M-1 | 🟡 Medium | `shell` param not validated against enum | ✅ Fixed |
| M-2 | 🟡 Medium | No login rate limiting | ✅ Fixed |

---

## 7. Test Verification

All 63 automated tests pass after full remediation:

```
Test Files  4 passed (4)
     Tests  63 passed (63)
  Duration  7.79s
```

Tests cover: setup flow, login/logout, session validation, admin-only routes, user CRUD, WebSocket ticket issuance, DB integrity, rate-limit enforcement, and per-account isolation.
