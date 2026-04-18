# 60 — Auth Security Hardening (Issue #265)

**Date:** April 18, 2026
**Issue:** `#265`
**Branch:** `fix/totp-auth-security-265`
**PR:** `#266`
**Status:** ⏳ PR Open

---

## Background

Post-merge audit of the login/logout system (added in PR #264) revealed two HIGH severity vulnerabilities in the TOTP authentication flow, plus several lower-severity issues. All fixed in this PR.

---

## Vulnerabilities Fixed

### 🔴 HIGH — Predictable TOTP Temp Token

**File:** `app/api/auth/login/route.ts`

The temp token issued during TOTP login was:
```
base64url(userId + ":" + username + ":" + role + ":" + Date.now())
```

This is not random. Admin is always `userId=1`, username is known from the login interaction, role is one of two values, and the timestamp window is 5 minutes (~300,000 possible values). An attacker who logged in as their own account could reverse-engineer the format and forge a token for any user — including admin.

**Fix:** Replaced with `crypto.randomBytes(32).toString('hex')` — 256 bits of entropy, unguessable.

---

### 🔴 HIGH — No Rate Limit on TOTP Verify

**File:** `app/api/auth/totp/verify/route.ts`

`POST /api/auth/totp/verify` had no throttling. TOTP codes are 6 digits = 1,000,000 combinations. With a valid or forged temp token, an attacker could brute-force the TOTP code in seconds with no resistance.

**Fix:** Added `checkRateLimit` keyed on the temp token — max 5 attempts per 15-minute window. On the 6th attempt the endpoint returns 429 and instructs the user to log in again.

---

### 🟠 MEDIUM — TOTP Setup Secret Rotated on Every GET

**File:** `app/api/auth/totp/setup/route.ts`

Every call to `GET /api/auth/totp/setup` for a user with TOTP not yet enabled generated a fresh secret and overwrote the one in the DB. If the endpoint was hit more than once mid-setup (browser refresh, race condition, or CSRF), the secret would rotate and the QR code already scanned by the user would become invalid.

**Fix:** Now checks if a pending secret already exists (`user.totp_secret` is non-null but `totp_enabled=0`) and reuses it. A new secret is only generated when the field is truly empty.

---

### 🟡 LOW — `sameSite: 'lax'` → `'strict'`

**File:** `lib/session.ts`

The session cookie used `sameSite: 'lax'`, which allows the cookie to be sent on top-level cross-site navigations. Changed to `strict` — the cookie is now only sent on same-origin requests. No functional impact for normal usage.

---

### 🟡 LOW — Unused `totpVerified` Field in SessionData

**File:** `lib/session.ts`

`SessionData` contained a `totpVerified?: boolean` field that was never set or checked anywhere in the codebase. Removed to avoid future confusion — a developer might assume TOTP state is tracked per-session and write logic based on it, creating a false trust boundary.

---

### 🟡 LOW — Stale Comment in WS Ticket Route

**File:** `app/api/auth/ws-ticket/route.ts`

Comment said "30 second TTL" — the actual TTL was changed to 5 seconds in PR #254. Comment updated.

---

## Honest Self-Assessment (Ethical Hacker Perspective)

**Grade: C+ for the original work. B+ for the audit.**

What was missed and shouldn't have been:

- **The temp token issue is embarrassing.** Base64 encoding is not encryption or hashing. Using predictable data as a security token is a textbook mistake. This should have been caught during initial implementation of the TOTP flow, not discovered in a post-merge audit. A random token takes one line — there's no excuse for the original approach.

- **Forgetting rate limits on a second auth factor is a significant oversight.** The main login endpoint has rate limiting. The TOTP verify endpoint is the continuation of the same auth flow. The same threat model applies. This was an inconsistency that an attacker would find immediately.

- **The TOTP setup secret rotation issue is subtler** and more forgivable — it requires a specific sequence to exploit. Still, it's the kind of thing a code reviewer should catch.

What was done well:

- The rate limiter implementation itself is solid (sliding window, username-keyed on main login).
- Argon2id with proper memory/time parameters is correct.
- iron-session with HKDF-derived key is a solid choice.
- SQLite-backed temp tokens (encrypted at rest via SQLCipher) are appropriate — better than the in-memory Map they replaced.
- The WS ticket system (HMAC + 5s TTL + one-time use) is well-designed.

The two HIGH issues together form a complete attack chain: forge the predictable token → brute-force TOTP with no rate limit → gain admin session. This is a real, exploitable vulnerability that existed in production between PR #264 merge and PR #266 merge.

---

## Files Changed

- `Dashboard/Dashboard1/app/api/auth/login/route.ts` (random token)
- `Dashboard/Dashboard1/app/api/auth/totp/verify/route.ts` (rate limit)
- `Dashboard/Dashboard1/app/api/auth/totp/setup/route.ts` (reuse secret)
- `Dashboard/Dashboard1/lib/session.ts` (sameSite strict, remove totpVerified)
- `Dashboard/Dashboard1/app/api/auth/ws-ticket/route.ts` (fix comment)
- `Project_S_Logs/60_Auth_Security_Hardening.md` (this file)
- `Project_S_Logs/00_Master_Implementation_Plan.md` (roadmap updated)
