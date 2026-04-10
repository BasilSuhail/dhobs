# ADR-0002: Entropy-Based Authentication with HKDF Key Derivation

**Status:** Accepted
**Date:** 2026-04-10
**Source:** Log 24 — Authentication System

## Context

Users need a single master key that encrypts their entire HomeForge installation. The key must be unpredictable, never transmitted over the network, and never stored in plaintext.

## Decision

Mouse movement entropy combined with CSPRNG, hashed via SHA-512, produces a 128-character hex key. HKDF-SHA512 derives three independent secrets: `SESSION_SECRET`, `WS_SECRET`, `DB_KEY`.

## Key Derivation Chain

```
User mouse movement + CSPRNG (window.crypto.getRandomValues)
    │
    ▼
SHA-512 → 128-char hex entropy key
    │
    ▼
HKDF-SHA512 (with unique info strings)
    ├──→ SESSION_SECRET  (iron-session cookie encryption)
    ├──→ WS_SECRET        (WebSocket ticket HMAC-SHA256)
    └──→ DB_KEY           (SQLCipher AES-256-GCM)
```

## Rationale

1. Mouse movement provides genuine, unpredictable entropy from user interaction
2. CSPRNG seeds the pool for additional cryptographic strength
3. SHA-512 hashes raw entropy into a uniform distribution
4. HKDF derives three independent secrets — compromise of one does not reveal the others
5. Runtime secrets are derived at startup, never written to disk or `.env`

## Consequences

**Positive:**
- No secrets on disk — all three derived at runtime
- Each installation is cryptographically unique
- iron-session cookies are HTTP-only, signed, encrypted (AES-256-GCM)
- User passwords hashed with Argon2id (64 MiB memory, 3 iterations)

**Negative:**
- User MUST save the entropy key — it cannot be recovered if lost
- No password reset flow exists — losing the key means losing the user database
- First-time setup requires ~10 seconds of mouse movement

## Implementation

- Web Crypto API on the frontend for entropy collection
- `iron-session` v8 for session management
- `better-sqlite3-multiple-ciphers` for encrypted SQLite
- `argon2` package for password hashing
- Sliding-window rate limiter on login: 10 attempts per username per 15 minutes
