# Project S — Theia CodeSpace Integration Log

This document records the strategic decision and technical implementation of the **Eclipse Theia** CodeSpace, providing a professional, in-browser IDE for the HomeForge ecosystem.

---

## 1. Goal: In-Browser Development Environment

To achieve a true "Home Server OS" experience, Project S must allow developers to modify and test the system *from within the system*. The CodeSpace module provides a complete, containerized environment for code editing, terminal access, and Docker orchestration without requiring local software installation.

---

## 2. The Strategic Shift: Theia vs. VS Code

While the initial Roadmap (Task 5) proposed VS Code Server (Coder), a technical audit in Stage 4 identified critical advantages for **Eclipse Theia**.

### 2.1 Comparative Analysis

| Feature | VS Code Server (Coder) | Eclipse Theia |
| :--- | :--- | :--- |
| **Licensing** | MIT (Core), but "VS Code" brand is proprietary. | **EPL-2.0** (100% Open Source & Neutral). |
| **Governance** | Controlled by Microsoft / Coder.com. | Governed by the **Eclipse Foundation**. |
| **White-Labeling** | Limited by branding policies. | Highly extensible; designed for deep integration. |
| **Extensions** | Full VS Code Extension support. | Compatible with Open VSX (Standard Extensions). |

### 2.2 Why This Matters
For Project S to remain a viable open-source project that can be commercialized or sold publicly, it must avoid "hidden" proprietary dependencies. Theia’s strict neutrality ensures no vendor lock-in and a cleaner legal path for redistribution.

---

## 3. Technical Architecture (Dockerized)

The CodeSpace runs as a privileged service within the HomeForge stack, allowing it to act as a "Master IDE" for the entire project.

### 3.1 Service Configuration (`docker-compose.yml`)

```yaml
theia:
  image: ghcr.io/eclipse-theia/theia-ide/theia-ide:latest
  container_name: project-s-theia
  user: root
  privileged: true
  ports:
    - '3030:3069'
  volumes:
    - .:/home/project/project-s        # Mounts entire Project S root
    - /var/run/docker.sock:/var/run/docker.sock # Control host Docker
  environment:
    - SHELL=/bin/bash
```

---

## 4. Data & File Structure

The Theia integration is designed for "Live Development," meaning changes made in the IDE are reflected instantly across the repository.

### 4.1 Repository Mapping

```text
OpenSource HomeLabbing/ (Host Root)
├── Dashboard/                  ← Source code editable via Theia
├── docker-compose.yml          ← Orchestration editable via Theia
└── Project_S_Logs/             ← Documentation editable via Theia
    └── 12_Theia_CodeSpace.md   ← This document
```

### 4.2 Integration Flow

| Layer | Integration Method | Purpose |
| :--- | :--- | :--- |
| **Backend** | Docker Volume (Root) | Allows Theia to edit the Dashboard source code directly. |
| **Orchestration** | Docker Socket Mount | Allows Theia to restart/rebuild other containers (Jellyfin, Nextcloud). |
| **Frontend** | Sidebar Link (`:3030`) | Integrated via the Dashboard navigation for instant access. |

---

## 5. Dashboard Implementation

The CodeSpace is accessible via two entry points in the Dashboard UI:

1.  **Sidebar Navigation:** A dedicated "Code" icon (`Code Space`) located between Nextcloud and Metrics.
2.  **Welcome Section:** An "Integrated" application card in the primary app grid.

- **URL:** [http://localhost:3030](http://localhost:3030)
- **localhost Transition:** To ensure compatibility with the HomeForge DinD sandbox, all internal URLs use `localhost` instead of hardcoded LAN IPs.

---

## 6. Collaborative Contributions (`Contributor`)

- **Service Architecture:** Saad established the `privileged` root user strategy to ensure the IDE has full control over the HomeForge environment.
- **Port Orchestration:** Configured the `3030` port mapping to prevent conflicts with the Dashboard (3069) or Nextcloud (8081).
- **UI Integration:** Saad initially built the CodeSpace button and welcome cards (later merged into the main Dashboard by Basil).

---

## 7. Iteration History

| Version | Date | Changes |
|---|---|---|
| v1 | 2026-03-25 | Initial service definition using Eclipse Theia image |
| v2 | 2026-03-26 | Implemented Docker Socket mount for internal orchestration |
| v3 | 2026-03-27 | Integrated "Code Space" button into Dashboard Sidebar and app grid |

---

## 8. Next Steps

- [ ] Implement a `codespace-section.tsx` component to embed Theia directly in an iframe (portal mode).
- [ ] Add basic authentication (Phase 2) to prevent unauthorized access to the IDE.
- [ ] Configure custom Theia plugins for automated Project S module scaffolding.

---

## 9. Credits & Reference

- **Eclipse Foundation:** For the industry-standard open IDE framework.
- **Implementation:** Contributor (@Contributor).
- **Strategy & Review:** Author.
- **Reference:** Task 5 in `Project_S_Roadmap.md`.

**Status:** Research & Core Implementation Completed.
