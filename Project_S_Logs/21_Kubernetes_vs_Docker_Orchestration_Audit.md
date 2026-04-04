# Project S — Kubernetes vs. Docker Orchestration Audit

## Document Purpose
This log evaluates the feasibility and strategic value of migrating the **HomeForge** (Project S) orchestration backend from Docker Compose to Kubernetes (K8s). It analyzes current 2026 industry trends, resource constraints, and the project's core principle of simplicity.

> **Product Context:** HomeForge is not a personal homelab — it is a **packaged product** designed to be installed by end-users on their own servers, mini-PCs, or Raspberry Pi clusters. Orchestration decisions directly impact the installation experience, hardware requirements, and maintenance burden for people who may have little to no DevOps background. Every added layer of complexity is a barrier to adoption.

---

## 1. Executive Summary
**Verdict:** **Retain Docker Compose/Swarm** as the primary orchestration engine for the HomeForge MVP and V1 release.

**Rationale:** 
- **Complexity Tax:** Kubernetes introduces significant operational overhead (networking, storage, and ingress) that conflicts with the "Single-Click/Simple" goal of HomeForge.
- **Industry Pivot:** Major players (notably TrueNAS SCALE) have recently reverted from Kubernetes back to Docker Compose to reduce maintenance burdens for home users.
- **Resource Efficiency:** K3s/K8s requires 5x–10x the idle RAM overhead compared to native Docker, which is detrimental to users on low-power hardware (Raspberry Pi/Mini-PCs).

---

## 2. The 2026 "Homelab Meta"
Research into the current landscape reveals a split in scaling strategies:

### A. The "Scale-Up" Model (Docker Compose)
*   **Target:** Single-node servers or large multi-core "Pet" servers.
*   **Trend:** Using high-density Mini-PCs (Intel N100/N200).
*   **Orchestration:** Docker Compose remains the standard for simplicity and speed.

### B. The "Scale-Out" Model (Kubernetes / Talos)
*   **Target:** Multi-node clusters of "Cattle" (small, identical nodes).
*   **Trend:** **Talos Linux** (immutable, API-driven OS) paired with **K3s**.
*   **Benefit:** High availability and automated "self-healing" if a node fails.

---

## 3. Case Study: The TrueNAS "Electric Eel" Precedent
A critical data point in this audit is iXsystems' decision to drop Kubernetes (K3s) from **TrueNAS SCALE (24.10 "Electric Eel")** in favor of native Docker and Docker Compose.

**Key Lessons:**
*   **Middleware Bloat:** The translation layer between the UI and Kubernetes was the primary source of bugs and support tickets.
*   **User Friction:** Home users struggled with K8s-specific concepts like PVCs and Ingress, leading to "configuration fatigue."
*   **Platform Stability:** Moving to native Docker improved app startup times and reduced system-level complexity.

---

## 4. Why Docker Compose is the Right Choice for a Packaged Product

This is the point most internal discussions miss. The question is not "what is the most powerful orchestrator?" — it is **"what gives our users the best installation and maintenance experience?"**

When someone installs HomeForge on their server they should be able to:
- Run one command (`./boom.sh`) and have everything working
- Read a single `docker-compose.yml` to understand every service
- Debug a failing container with `docker logs <name>` — no cluster knowledge required
- Upgrade a service by changing one image tag

Kubernetes cannot offer any of this without significant operator knowledge. The barrier to entry is simply too high for the target audience HomeForge is trying to reach.

Furthermore, from a packaging perspective:
- Docker and Docker Compose are pre-installed on most server distributions and VPS providers
- K3s/K8s requires additional setup, kernel modules, and port management even on a single node
- A HomeForge installer that requires Kubernetes would immediately exclude Raspberry Pi users, N100 mini-PC users, and anyone on a shared VPS

The TrueNAS "Electric Eel" precedent (Section 3) is the clearest industry signal: even a well-resourced company with full-time engineers found that Kubernetes was the wrong choice for home users.

---

## 5. Scaling for HomeForge (The Proposed Path)

To balance **Simplicity** with **Scaling Capability**, HomeForge should adopt a phased approach:

| Phase | Strategy | Orchestrator |
| :--- | :--- | :--- |
| **Phase 1 (MVP/Beta)** | Single-node "One-Box" experience. Any server, any hardware. | Docker Compose |
| **Phase 2 (Growth)** | Multi-node expansion, UI-driven deployment, zero-downtime updates. | Dokploy (wraps Docker Compose + Swarm) |
| **Phase 3 (Enterprise)** | High-end AI & distributed data workloads for power users. | Kubernetes (via Driver Abstraction) |

### Strategic Recommendation: The "Driver" Abstraction
Instead of hard-coding Docker commands into the HomeForge backend, we should implement a **Driver Interface**.
*   The UI talks to the `OrchestrationDriver`.
*   The initial implementation uses the `DockerComposeDriver`.
*   A `KubernetesDriver` can be added later without rewriting the Dashboard or Logic layers.

### Phase 2 Recommendation: Dokploy
**Dokploy** is the natural next step after Docker Compose for HomeForge. It is an open-source, self-hosted PaaS that wraps Docker Compose and Swarm with a clean management UI. Critically for HomeForge:
- It is itself deployed as a single Docker container — consistent with our installation philosophy
- Supports multi-server management from one dashboard
- Provides zero-downtime deployments, automatic SSL, and built-in monitoring
- Does not require users to learn any new concepts beyond what they already know from HomeForge
- Aligns with the existing deployment target already noted in the project stack

This is what enables HomeForge to scale from "one person, one server" to "team, multiple servers" without a full orchestration rewrite.

---

## 6. Career & Domain Relevance
As the Lead Developer (Basil) is specializing in **Data Science & AI Engineering**, the following distinction is made:

*   **For the Product (HomeForge):** Use Docker. It ensures the fastest time-to-market and the best user experience for non-technical users.
*   **For the Developer (Portfolio):** Build a separate, secondary cluster using **Talos Linux + K3s**. Use this as a sandbox for high-stakes AI workloads (Ray, Kubeflow, RAG stacks) to maintain "production-grade" skills in the enterprise market.

---

## 7. Conclusion
Moving HomeForge to Kubernetes today would be a strategic error (over-engineering). We will continue with Docker Compose but maintain a clean abstraction layer to ensure that "Scaling" is a modular upgrade, not a foundational requirement.

**Status:** Confirmed. Proceeding with Docker-based implementation for Beta v0.1.0.

---
**Author:** Basil's Senior Coding Partner
**Date:** Saturday, 4 April 2026
**Project:** HomeForge (Project S)
