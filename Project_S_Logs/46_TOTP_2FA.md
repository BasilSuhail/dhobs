# 46 — TOTP Two-Factor Authentication (Issue #209)

**Date:** April 13, 2026  
**Author:** Basil Suhail  
**Related Issue:** #209  
**PR:** #210  
**Branch:** `feat/2fa-totp`  
**Status:** ✅ Merged to main

---

## Context

Dashboard login previously required only username+password. Since the dashboard protects the entire homelab, a single password was insufficient for production security.

**Goal:** Add TOTP-based 2FA compatible with Google Authenticator, Authy, and 1Password.

---

## Implementation

### 1. Database Migration
- Added `totp_secret TEXT` and `totp_enabled INTEGER DEFAULT 0` columns to `users` table
- Idempotent `ALTER TABLE` with try/catch (safe for existing databases)

### 2. TOTP Service (`lib/totp.ts`)
- `otplib@13` with `@otplib/plugin-crypto-noble` and `@otplib/plugin-base32-scure`
- `generateTotpSecret()` — 20-byte base32 (128-bit entropy)
- `generateTotpUri()` — generates `otpauth://` URI for QR codes
- `verifyTotpCode()` — validates 6-digit code with ±1 step drift
- `qrcode` library for QR code generation

### 3. API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Returns `{ needsTotp: true, tempToken }` if user has 2FA enabled |
| `/api/auth/totp/setup` | GET | Returns QR code + secret for new TOTP setup |
| `/api/auth/totp/verify` | POST | Verifies code (login mode with tempToken OR setup mode with session) |
| `/api/auth/totp/verify` | DELETE | Disables 2FA (requires current TOTP code) |

### 4. Two-Step Login Flow
1. User enters username+password → server validates → if `totp_enabled`, returns `tempToken`
2. User enters 6-digit TOTP code → server verifies against tempToken → creates full session
3. Temp tokens expire in 5 minutes, single-use, deleted after verification

### 5. Setup Flow (Step 4)
After account creation during initial setup:
- User sees QR code to scan with authenticator app
- Manual secret entry available in collapsible `<details>`
- User enters 6-digit code to verify
- Can skip — 2FA can be enabled later from settings

### 6. Login UI
- Two-step: credentials form → TOTP code form (with `InputOTP` 6-digit slots)
- Back button returns to credentials step
- Error messages for invalid codes

### 7. Session
- `SessionData` updated with `totpVerified?: boolean` field
- Full session only created after TOTP verification

---

## Security Design

| Aspect | Detail |
|--------|--------|
| Temp token lifetime | 5 minutes |
| Temp token reuse | Single-use (deleted after verification) |
| TOTP drift window | ±1 step (±30 seconds) |
| TOTP algorithm | SHA-1, 6 digits, 30-second step (RFC 6238 standard) |
| Secret entropy | 128 bits (20 bytes, 160-bit base32) |
| Existing users | Unaffected — `totp_enabled = 0` skips TOTP step |

---

## Files Changed

| File | Change |
|------|--------|
| `lib/db/index.ts` | Idempotent ALTER TABLE for totp columns |
| `lib/db/users.ts` | Updated interfaces, createUser, verifyUser, getUserById, listUsers |
| `lib/totp.ts` | **NEW** — TOTP service with otplib + qrcode |
| `lib/session.ts` | Added totpVerified to SessionData |
| `app/api/auth/login/route.ts` | Temp token flow for TOTP users |
| `app/api/auth/totp/setup/route.ts` | **NEW** — GET returns QR + secret |
| `app/api/auth/totp/verify/route.ts` | **NEW** — POST/DELETE handles verification and disable |
| `app/login/page.tsx` | Two-step UI (credentials → TOTP) |
| `app/setup/page.tsx` | Step 4: QR scan + verify |
| `package.json` | Added otplib, qrcode, @types/qrcode |

---

## Commits

| Commit | Description |
|--------|-------------|
| `0ed6342` | feat(2fa): add TOTP-based two-factor authentication |

---

## Acceptance Criteria
- [x] New users can set up 2FA during initial setup (step 4)
- [ ] Existing users can enable 2FA from settings page (future work)
- [x] Users with 2FA see TOTP step after password
- [x] Users without 2FA log in normally (backward compatible)
- [x] Setup can be skipped and done later
- [x] Temp tokens expire after 5 minutes
- [x] TypeScript compiles cleanly
- [x] Single commit per 1:1:1 protocol
