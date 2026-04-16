# 56 — Architecture SSOT (Issue #241)

**Date:** April 16, 2026
**Issue:** `#241`
**Branch:** `docs/architecture-ssot-241`
**Status:** ⏳ PR Open

---

## Problem

HomeForge grew to 20 containers and 55 implementation logs with no single document explaining the system architecture. New contributors had no entry point. The existing docs were fragmented:

- `Dashboard/Dashboard1/docs/ARCHITECTURE.md` — dashboard internals only
- `docs/decisions/0001–0006.md` — ADRs existed but weren't indexed
- `docs/data-volumes.md` — volume contract existed but wasn't linked
- No system-level diagram, no service catalog, no network topology doc

---

## Solution

Created `ARCHITECTURE.md` at repo root using hub+spokes:
- Synthesizes existing docs rather than duplicating them
- Links to `docs/decisions/`, `docs/data-volumes.md`, `Dashboard/Dashboard1/docs/ARCHITECTURE.md`
- No drift risk — each section points to the authoritative source

---

## What's in ARCHITECTURE.md

1. **System overview** — 2-paragraph summary of HomeForge architecture
2. **Stack diagram** — ASCII art, Traefik-centric, all 20 containers
3. **Network topology** — `frontend` / `backend` / `database` network table with host-isolation notes
4. **Service catalog** — all 20 containers: port, networks, depends-on, purpose
5. **Security model** — entropy→HKDF→3 keys diagram + DB/session/socket notes
6. **Data volume contract** — `./data/` hierarchy + link to `docs/data-volumes.md`
7. **Key documents** — ADR index table + deep dive links

---

## Files Changed

- `ARCHITECTURE.md` (new — repo root)
- `Project_S_Logs/56_Architecture_SSOT.md` (this file)
- `Project_S_Logs/00_Master_Implementation_Plan.md` (v1.0.1 table updated)
- `docs/superpowers/specs/2026-04-16-architecture-ssot-design.md` (design spec)
- `docs/superpowers/plans/2026-04-16-architecture-ssot.md` (implementation plan)
