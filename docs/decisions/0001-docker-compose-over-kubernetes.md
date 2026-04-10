# ADR-0001: Use Docker Compose Over Kubernetes

**Status:** Accepted
**Date:** 2026-04-04
**Source:** Log 21 — Kubernetes vs. Docker Orchestration Audit

## Context

HomeForge is a packaged product for end-users installing on their own servers, mini-PCs, or Raspberry Pi clusters. We evaluated K3s/Kubernetes vs Docker Compose as the orchestration layer.

Key considerations:
- Installation simplicity (one command: `./boom.sh`)
- Resource efficiency on low-power hardware (Raspberry Pi, N100 mini-PCs)
- Maintenance burden for users with no DevOps background
- Industry trends in the home server space

## Decision

Retain Docker Compose as the primary orchestration engine for HomeForge MVP and V1. Kubernetes migration is deferred to Phase 3 (planned as a driver abstraction, not a full rewrite).

## Rationale

1. **Complexity tax** — Kubernetes introduces significant operational overhead (networking, storage, ingress) that conflicts with the "simple install" goal
2. **Industry precedent** — TrueNAS SCALE 24.10 "Electric Eel" reverted from K3s back to Docker Compose for home users; the UI-to-K8s middleware was the primary source of bugs
3. **Resource efficiency** — K3s requires 5x–10x idle RAM overhead vs native Docker, detrimental to low-power hardware
4. **Installation friction** — Docker Compose is pre-installed on most server distributions; K3s requires additional setup, kernel modules, and port management
5. **Debugging barrier** — `docker logs <name>` vs `kubectl logs` — the former requires no cluster knowledge

## Consequences

**Positive:**
- One command installs everything
- Single `docker-compose.yml` explains every service
- Debug with `docker logs` — no cluster knowledge required
- Upgrade by changing one image tag

**Negative:**
- No multi-node support (deferred to Phase 2 via Dokploy)
- No self-healing or automated scaling
- Manual service dependency management via `depends_on`

## Future

A `Driver` abstraction will be implemented: UI talks to `OrchestrationDriver`, initial implementation is `DockerComposeDriver`, `KubernetesDriver` can be added later without rewriting the dashboard.
