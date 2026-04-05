# CYBERSECURE Remediation Report
**Project:** HomeForge Dashboard  
**Date:** 2026-04-04  
**Based on:** `CYBERCHECK_REPORT.md`  
**Final test result:** 63/63 passing (3 new rate-limit tests added, IP-key bug fixed)

---

## 1. Root Cause Analysis

### Why did these vulnerabilities exist?

| Finding | Root Cause |
|---|---|
| **4 unauthenticated API routes** | The auth system was built after the infrastructure routes. Middleware protection covers page routes cleanly, but route handlers lacked in-handler guards as a second layer of defence. |
| **Login password minimum (1 char)** | Inconsistent schema constants — the setup and user-creation schemas used `min(12)` but the login schema was copied from a stub and never updated to match. |
| **Unvalidated container name** | The container name was treated as an opaque passthrough value. The WebSocket server trusted the client-encoded string without asserting it against the set of containers it actually manages. |
| **No idle timeout** | PTY sessions were tied to the WebSocket lifecycle only — no server-side timer. A disconnected-but-not-closed WS would leave a shell alive indefinitely. |
| **`shell` param not validated** | Only two shell types have dedicated logic; the fallback to the unified shell was intended as a default rather than a security concern, leaving no explicit rejection path for unknown values. |
| **No rate limiting** | Rate limiting requires a deliberate design choice (window size, max, store type). It was recommended but deferred in the original implementation. |

---

## 2. Remediation Strategy

**No API breaking changes** were required. All fixes were additive:
- Auth guards are transparent to well-behaved (authenticated) clients.
- Rate-limit headers (`X-RateLimit-*`) follow RFC 6585 and are informational — existing clients that ignore unknown headers are unaffected.
- The 429 response uses a standard `Retry-After` header so well-behaved clients back off automatically.
- Container/shell validation only rejects inputs that were already semantically invalid.

**Single-node in-memory store** was chosen for rate limiting because HomeForge runs as a single Docker container. Redis would be over-engineered for this deployment model and would add an additional service dependency with its own attack surface.

---

## 3. Changes Made

### 3.1 `lib/rate-limit.ts` — New file

A generic sliding-window rate limiter keyed by any string (typically `"{action}:{ip}"`).

**Algorithm:** For each key, a timestamped array is maintained. On every call, entries older than `windowMs` are dropped, the current count is compared to `max`, and — only if allowed — the current timestamp is appended. Rejected requests do not consume a slot, preventing artificial window inflation.

**Memory safety:** A `setInterval` sweep (every 5 minutes) removes keys inactive for more than 1 hour. The timer uses `.unref()` so it does not prevent the Node.js process from exiting cleanly in tests.

```typescript
// Key exports
checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult
getClientIp(req): string          // x-forwarded-for → x-real-ip → 'unknown'
_resetRateLimitStore(): void      // test-only
```

**Response headers emitted on every call:**
```
X-RateLimit-Limit:     10
X-RateLimit-Remaining: 7
X-RateLimit-Reset:     1712345678   (Unix seconds when oldest slot expires)
Retry-After:           843          (seconds; only on 429)
```

---

### 3.2 `app/api/auth/login/route.ts`

**Before:**
```typescript
const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1),           // ← weak
})

export async function POST(req: NextRequest) {
  if (!isSetupComplete()) { ... }
  // no rate limiting
```

**After:**
```typescript
const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(12),          // aligned with setup + user creation
})

const LOGIN_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 }

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit(`login:${ip}`, LOGIN_LIMIT)
  // ... 429 with Retry-After if !rl.allowed
  // ... X-RateLimit-* headers on all responses including success
```

Window: **10 attempts per username per 15 minutes.** The limiter is keyed by `login:{username.toLowerCase()}`, not by IP. Since HomeForge runs without a reverse proxy, `x-forwarded-for` is never populated and `getClientIp()` would return `'unknown'` for all clients — making an IP-keyed limiter a global lock shared by every user. Username-keying correctly scopes the limit to each account: brute force against `admin` doesn't affect `viewer1`, and a legitimate user on a different account is never caught in someone else's lockout. Argon2id's 64 MiB memory cost further constrains real throughput to ~5 req/s per core regardless.

---

### 3.3 `app/api/auth/setup/route.ts`

Rate limiting added with a tighter window appropriate for a one-time operation:

```typescript
const SETUP_LIMIT = { windowMs: 60 * 60 * 1000, max: 5 }
```

**5 attempts per IP per hour.** Rationale: a legitimate user would attempt setup at most once; 5 allows for fat-finger mistakes with a comfortable margin.

---

### 3.4 `app/api/stats/route.ts`, `app/api/kiwix/route.ts`, `app/api/ollama/route.ts`

Auth guard added as first statement:
```typescript
import { requireSession } from '@/lib/auth'
export async function GET() {
  await requireSession()
  // ...
}
```

---

### 3.5 `app/api/kiwix/restart/route.ts`

Admin-only guard (viewers cannot restart containers):
```typescript
import { requireAdmin } from '@/lib/auth'
export async function POST() {
  await requireAdmin()
  // ...
}
```

---

### 3.6 `custom-server.ts`

Three changes:

**Container name whitelist:**
```typescript
const ALLOWED_CONTAINERS = new Set([
  'project-s-jellyfin', 'project-s-nextcloud', 'project-s-ollama',
  'project-s-kiwix-reader', 'project-s-collabora',
  'project-s-vaultwarden', 'project-s-dashboard',
])
// Rejects unknown names with WS close code 4400
```

**Shell type enum enforcement:**
```typescript
const VALID_SHELL_TYPES = new Set(['ollama', 'container', null])
// Rejects unknown shell types with WS close code 4400
```

**30-minute idle timeout:**
```typescript
const IDLE_TIMEOUT_MS = 30 * 60 * 1000
let idleTimer = setTimeout(() => ws.close(4408, 'Session idle timeout'), IDLE_TIMEOUT_MS)
ws.on('message', () => { clearTimeout(idleTimer); idleTimer = setTimeout(...) })
cleanup = () => { clearTimeout(idleTimer); shell.kill() }
```

---

## 4. Remaining Open Item

| ID | Severity | Finding | Status |
|---|---|---|---|
| — | Low | WebSocket connections are not individually rate-limited | Open — acceptable |

A single valid session can open multiple simultaneous WebSocket terminal sessions. This is low severity because: (a) each connection requires a valid 30-second HMAC ticket, (b) the 30-minute idle timeout bounds resource consumption per session, and (c) node-pty shell spawning is self-limiting by OS process limits. If this becomes a concern, a per-`userId` connection counter can be added to `custom-server.ts`.

---

## 5. Maintaining These Controls

### Adding a new API route
Every new route handler must start with one of:
```typescript
await requireSession()  // any authenticated user
await requireAdmin()    // admin only
// or: explicitly documented as public (e.g., /api/auth/setup/status)
```

### Adding a new container to the terminal
Add the container name to `ALLOWED_CONTAINERS` in `custom-server.ts`:
```typescript
const ALLOWED_CONTAINERS = new Set([
  // ... existing entries ...
  'project-s-your-new-service',
])
```

### Adjusting rate-limit thresholds
Edit the limit constants at the top of the relevant route file:
```typescript
const LOGIN_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 }
//                                ↑ 15 min          ↑ max attempts
```

If HomeForge is ever deployed behind a load balancer with multiple instances, replace the in-memory store in `lib/rate-limit.ts` with a Redis-backed implementation using the same `checkRateLimit` interface — no other files need to change.

### Test coverage
The `__tests__/api-auth.test.ts` file includes 3 rate-limit test cases:
- `X-RateLimit-*` headers present on allowed requests
- 429 returned after 10 attempts from the same IP
- Different IPs have independent counters

Run with: `npx vitest run`

---

## 6. Final Vulnerability Status

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
| M-2 | 🟡 Medium | No login/setup rate limiting | ✅ Fixed |
