# ADR-0004: Dashboard as Central Control Plane

**Status:** Accepted
**Date:** 2026-04-10

## Context

Users need a single interface to monitor, manage, and interact with all HomeForge services. We needed to decide between a monolithic dashboard vs. separate microservices for auth, metrics, terminal, etc.

## Decision

Build a single Next.js 16 application as the central control plane — monolithic by design. No microservice split for v0.1.0.

## Rationale

1. One codebase, one deploy, one login — aligns with "one dashboard, one login" product principle
2. Next.js API routes handle all backend logic without a separate API service
3. WebSocket server runs alongside Next.js on port 3070 — same process, shared state
4. Dashboard mounts Docker socket to monitor all containers — no separate agent needed
5. Dashboard mounts `./data` as read-only for metrics collection across all services

## What the Dashboard Does

| Responsibility | Implementation |
|---|---|
| Authentication | iron-session, Argon2id, SQLCipher, entropy key |
| Session management | HTTP-only encrypted cookies, middleware guards |
| Server metrics | Docker API via `/var/run/docker.sock` mount |
| Service health | Poll container healthchecks |
| Terminal | WebSocket PTY via `node-pty`, ticket-authenticated |
| Backup/restore | Orchestrate `docker compose` commands |
| Kiwix proxy | Proxy ZIM file browsing and management |
| Ollama proxy | Proxy model management and inference |
| Module launching | iframe embeds for Jellyfin, Nextcloud, Element, etc. |

## Consequences

**Positive:**
- Single deployment to manage
- Shared state between auth, metrics, terminal — no inter-service calls
- Simple to debug: one application, one log stream

**Negative:**
- Dashboard is the single point of failure for auth and management
- Large codebase — harder to isolate bugs
- All dashboard logic must be documented internally (`Dashboard/Dashboard1/docs/ARCHITECTURE.md` planned)

## Future

Microservice split is deferred to post-beta. The dashboard remains intentionally monolithic for v0.1.0.
