# ADR-0003: SQLCipher for User Database Encryption at Rest

**Status:** Accepted
**Date:** 2026-04-10

## Context

The dashboard needs a user database for accounts, sessions, and roles. Requirements:
- Encrypted at rest
- Lightweight (single-node, no separate database container)
- Simple backup/restore
- Compatible with Node.js

## Decision

Use SQLCipher via the `better-sqlite3-multiple-ciphers` npm package.

## Rationale

1. SQLite is zero-config, single-file — no separate database container needed
2. SQLCipher adds AES-256-GCM encryption transparently
3. `better-sqlite3-multiple-ciphers` provides synchronous Node.js bindings
4. Pre/post-setup rekey: database opens with a temporary UUID-derived key, then `PRAGMA rekey` transitions to the entropy-derived key after setup completes
5. Single file makes backup trivial (copy the file)

## Consequences

**Positive:**
- Database file is unreadable without the entropy-derived `DB_KEY`
- No backup/restore complexity of a separate database server
- Single file backup — copy `data/security/homeforge.db`
- Fits the single-node, low-overhead design

**Negative:**
- Limited to single-writer — acceptable for user management workload
- Not suitable for high-concurrency (but HomeForge is single-user/few-user)
- Requires `better-sqlite3-multiple-ciphers` (fork of `better-sqlite3`) — must track upstream updates

## Implementation

- Database location: `./data/security/homeforge.db` (encrypted)
- Pre-setup: opens with temporary UUID-derived key
- Post-setup: `PRAGMA rekey` to entropy-derived `DB_KEY`
- User schema: id, username, password_hash (Argon2id), role (admin/viewer), created_at
