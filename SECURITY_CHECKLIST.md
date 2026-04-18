# Security Checklist for Auth & API PRs

Run this before opening any PR that touches authentication, session handling, or API endpoints.

---

## Tokens & Secrets

- [ ] Any token that grants access uses `crypto.randomBytes(32).toString('hex')` — never base64 of known data, never UUIDs, never timestamps
- [ ] Tokens are stored in the DB (not in-memory) if they need to survive restarts
- [ ] Tokens have an expiry and are deleted after use or on expiry

## Rate Limiting

- [ ] Every endpoint that accepts credentials or auth tokens has `checkRateLimit` applied
- [ ] If step 1 of an auth flow has a rate limit, step 2 has one too
- [ ] Rate limit key is specific enough — keyed on token, username, or user ID (not just IP)

## Input Validation

- [ ] All inputs validated with Zod before use
- [ ] String lengths bounded
- [ ] No user input interpolated into SQL (use prepared statements only)

## Session & Cookies

- [ ] Session cookie is `httpOnly: true`, `sameSite: 'strict'`, `secure: true` in production
- [ ] `session.destroy()` called on logout
- [ ] No sensitive data stored in the session beyond what's needed (userId, username, role)

## Auth Guards

- [ ] Protected routes call `requireSession()` or `requireAdmin()`
- [ ] New public routes are explicitly added to `PUBLIC_PREFIXES` in `middleware.ts` — not just assumed to be accessible

## General

- [ ] No `console.log` of passwords, tokens, or secrets
- [ ] Error messages don't leak whether a username exists or not
- [ ] New endpoint has a threat model: who can call it, with what, how many times

---

> Added after the TOTP auth vulnerabilities found post-merge in April 2026 (issues #262, #265).
> These checks exist because basics were missed in production — use this every time.
