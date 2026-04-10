# 33 — Dashboard Internal Architecture (Phase 4)

Date: 2026-04-10
Author: Basil Suhail
Related Issue: #176
Branch: `phase-4/dashboard-internal`
PR: #180

---

## Context

The Dashboard was a Next.js 16 monolith with no internal architecture documented. No one (including future contributors) knew how the auth chain worked, which API routes required admin access, or how WebSocket terminal sessions were authenticated — without reading every file individually.

---

## Changes Made

### 1. `Dashboard/Dashboard1/docs/ARCHITECTURE.md` Created

Documents the complete internal architecture:

**Layer diagram:**
```
Browser → middleware.ts → auth.ts → session.ts → SQLCipher DB → API routes → WebSocket server
```

**Contents:**
- Directory structure (28 directories, 5 top-level files)
- Layer diagram (middleware → auth → session → DB → API → WebSocket)
- Full API route map with auth/admin requirements per route (5 route groups, 20+ endpoints)
- Authentication chain: mouse entropy → HKDF → SESSION_SECRET/WS_SECRET/DB_KEY
- WebSocket terminal ticket flow: HMAC-SHA256, 30s expiry, constant-time comparison
- Startup sequence: start.sh → bootstrap.js → Next.js (3069) + WS server (3070)
- Security boundaries: Argon2id (64 MiB, 3 iterations), sliding-window rate limiter, container allowlist
- Docker socket access explained

### 2. Inline Architecture Comments Added

| File | What Was Added |
|---|---|
| `middleware.ts` | Session guard flow: public path check → iron-session validation → header injection → redirect |
| `lib/auth.ts` | requireSession/requireAdmin function documentation, second layer of auth after middleware |
| `lib/session.ts` | iron-session v8 configuration: AES-256-GCM, 7-day TTL, bootstrap dependency |

---

## Impact

| Metric | Before | After |
|---|---|---|
| Internal architecture documented | No | Yes (`docs/ARCHITECTURE.md`) |
| API route auth requirements | Scattered across files | Single table with 20+ endpoints |
| Entropy key derivation | Code-only | Documented with diagram |
| WebSocket terminal auth | Undocumented | Full ticket flow documented |
| Inline code comments | None | 3 key files documented |

---

**Status:** Merged. PR #180.
