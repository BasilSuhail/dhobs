# Project S — Jellyfin Media Integration Log (More Ocnfiguration needed)

This document records the integration of the Jellyfin Media Server into the Project S dashboard, serving as the core of the HomeForge entertainment and NAS layer.

---

## 1. Goal: Local, High-Performance Media Hosting

The objective was to embed a professional-grade media player directly within the Project S dashboard without sacrificing privacy or local control. This allows users to access their private movie, TV, and music libraries from a single, unified interface.

### Why Jellyfin?
- **License:** 100% Free and Open Source (**MIT/GPLv2 hybrid**). No "Premiere" tiers or remote-auth requirements.
- **Portability:** Rock-solid Docker images with hardware acceleration support.
- **Frontend Compatibility:** The web interface is highly responsive and works seamlessly inside iframes.

---

## 2. Technical Architecture (Dockerized)

The Jellyfin service is a first-class citizen in the Project S `docker-compose.yml` stack, configured for maximum persistence and performance.

### 2.1 Service Configuration

```yaml
jellyfin:
  image: jellyfin/jellyfin:latest
  container_name: project-s-jellyfin
  ports:
    - '8096:8096'
  volumes:
    - ./data/jellyfin/config:/config   # User profiles, library DBs, & metadata
    - ./data/jellyfin/cache:/cache     # Transcoding and image cache
    - ./data/media:/media              # The actual user media library
  restart: 'unless-stopped'
```

---

## 3. Data & File Structure

The integration maintains a strict separation between application configuration, ephemeral cache, and user media assets.

### 3.1 Repository Mapping

```text
OpenSource HomeLabbing/
├── data/
│   ├── jellyfin/
│   │   ├── config/             ← User profiles, library DBs, & metadata
│   │   └── cache/              ← Transcoding chunks & image thumbnails
│   └── media/                  ← Primary mount for Movie/TV/Music folders
└── Dashboard/Dashboard1/
    └── components/dashboard/
        └── media-section.tsx   ← React component for iframe embedding
```

### 3.2 Persistence Strategy

| Host Path | Container Path | Purpose |
| :--- | :--- | :--- |
| `data/jellyfin/config` | `/config` | Stores the `jellyfin.db`, plugin data, and metadata. |
| `data/jellyfin/cache` | `/cache` | Stores transcoded video chunks and image thumbnails. |
| `data/media` | `/media` | The primary mount point for the user's movie, music, and show folders. |

---

## 4. Dashboard Implementation (`media-section.tsx`)

The integration uses a **Secure Iframe** approach, allowing the Dashboard to act as a unified portal while Jellyfin handles the heavy lifting of streaming.

### 4.1 Component Logic
The `MediaSection` component in `Dashboard/Dashboard1/components/dashboard/media-section.tsx` wraps the iframe in a styled glass container.

- **Dynamic Navigation:** The sidebar "Media" button triggers a React state change (`currentSection: "media"`) in the main `app/page.tsx`.
- **Iframe Permissions:** Explicitly allows `autoplay`, `encrypted-media`, and `fullscreen` to ensure the player functions exactly like a native app.
- **localhost Transition:** Following an audit in Log 07, hardcoded LAN IPs were replaced with `localhost` for cross-environment compatibility.

---

## 5. Collaborative Contributions (`saadsh15`)

- **Dockerization:** Saad implemented the initial `jellyfin` service block and established the volume mapping strategy.
- **DinD Support:** Integrated Jellyfin into the `Dockerfile.dind` master image for isolated sandbox testing.
- **Glass UI Integration:** Styled the media section using `backdrop-blur-xl` and `bg-black/40` to match the Blackboard design language.

---

## 6. Iteration History

| Version | Date | Changes |
|---|---|---|
| v1 | 2026-03-24 | Initial docker-compose service definition and media folder mapping |
| v2 | 2026-03-25 | Created `media-section.tsx` with iframe embedding and sidebar routing |
| v3 | 2026-03-26 | Refactored IP addresses to `localhost` and added DinD support |

---

## 7. Next Steps

- [ ] Implement "Now Playing" widgets on the main dashboard using Jellyfin REST API.
- [ ] Add hardware acceleration (VAAPI/NVENC) toggle in the HomeForge settings UI.
- [ ] Sync Dashboard theme colors (Blackboard) with Jellyfin web CSS (Custom CSS injection).

---

## 8. Credits & Reference

- **Jellyfin Team:** For the best open-source media solution.
- **Implementation:** Saad Shafique (@saadsh15).
- **Reference:** Task 3 in `Project_S_Roadmap.md`.

**Status:** Operational (v1.0).
