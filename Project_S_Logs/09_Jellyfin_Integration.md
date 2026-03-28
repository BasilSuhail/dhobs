# Project S — Jellyfin Media Integration Log

This document records the integration of the Jellyfin Media Server into the Project S dashboard as the primary NAS and entertainment layer.

---

## 1. Integration Goal

* To provide a high-performance, open-source media management solution.
* To ensure total data privacy by hosting all media assets locally.
* To offer a seamless "Netflix-style" experience directly within the Project S Dashboard.

## 2. Technical Architecture

* **Service Type:** Containerized service within the Docker Compose stack.
* **Embedding Method:** Integrated via an iframe in the `MediaSection.tsx` component.
* **Network Path:** Internal traffic routed via `project-s-jellyfin:8096`.
* **Resource Mapping:**
    * `/config`: Persistent metadata and user settings.
    * `/cache`: Transcoding and image cache.
    * `/media`: Read-only access to the host's primary media library.

## 3. Implementation Details

* **Visual Consistency:** The iframe is housed within a GlassCard container with `backdrop-blur-xl` and `bg-black/40` styling to match the Blackboard theme.
* **Navigation:** Sidebar "Media" button triggers a smooth section swap via the main App Router state.
* **Persistence:** All user watch history and library scans are stored in `./data/jellyfin` on the host system.

## 4. Research & Selection Criteria

* **License:** Jellyfin was chosen specifically for its **MIT License**, avoiding the proprietary tiers found in Plex or Emby.
* **Web Accessibility:** Fully responsive web interface that works across desktop and mobile browsers.
* **API Surface:** Robust REST API allows for future "Now Playing" widgets on the Dashboard home screen.

## 5. Credits & Licenses

* **Jellyfin:** The volunteer-built media solution — **MIT License**.
* **Project Repository:** [github.com/jellyfin/jellyfin](https://github.com/jellyfin/jellyfin)
* **Lead Integrator:** Saad Shafique (@saadsh15).
* **Reference:** Task 3 in Project S Roadmap.
