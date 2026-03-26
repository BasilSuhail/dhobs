# Project S — Jellyfin Media Integration Log

This document records the integration of the Jellyfin Media Server into the Project S dashboard.

---

## 1. Summary
Jellyfin is the primary media management layer for Project S, providing streaming services for movies, music, and shows via a unified web interface.

---

## 2. Selection Rationale
Jellyfin was selected for the Project S NAS/Media layer because:
- **Open Source:** Unlike Plex or Emby, Jellyfin is entirely free and open-source.
- **MIT License:** It aligns with the project's goal of using strictly permissive or compatible open-source licenses.
- **Feature Completeness:** It provides high-quality metadata scraping, hardware acceleration, and a robust REST API for future deep integration.

---

## 3. Implementation: `MediaSection.tsx`
The integration uses an **iframe embedding** strategy within the `MediaSection` component.
- **Style:** The section clears the Project S sidebar (`pl-20`) and wraps the media player in a glassmorphic container (`bg-black/40 backdrop-blur-xl`).
- **Functionality:** It provides the full Jellyfin experience, including library browsing and video playback, directly within the dashboard shell.

---

## 4. Credits & Licenses
- **Jellyfin:** Developed by the Jellyfin Team (MIT License).
- **Project Site:** [jellyfin.org](https://jellyfin.org)
- **Repository:** [github.com/jellyfin/jellyfin](https://github.com/jellyfin/jellyfin)
