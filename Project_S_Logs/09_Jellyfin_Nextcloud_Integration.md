# Project S — Jellyfin, Nextcloud & Storage Integration Log

This document records the implementation of core service modules and the custom storage management interface within the Project S dashboard.

---

## 1. Summary
The Project S dashboard integrates third-party tools (Jellyfin and Nextcloud) alongside a custom-built File Manager. This hybrid approach provides high-quality existing services for media and productivity while maintaining a bespoke, branded experience for system-wide file management.

---

## 2. Core Service Selection

### 2.1 Jellyfin (Media)
**Choice:** Jellyfin was chosen over Plex or Emby due to its **100% MIT License** and lack of "paywalls" for hardware acceleration or mobile app access. It aligns with the Project S philosophy of total user control and no licensing overhead.

### 2.2 Nextcloud (Productivity)
**Choice:** Nextcloud remains the industry standard for self-hosted productivity. While its license is AGPL, it is integrated as an external service in the Compose stack, satisfying the "optional module" requirement while providing a full Google Suite alternative (Files, Calendar, Contacts).

---

## 3. Integration Strategy: The Iframe Approach

Both Jellyfin and Nextcloud are embedded via `MediaSection` and `NextcloudSection` components using `<iframe>` elements.

- **Implementation Details:**
  - Components use `h-screen` and `pl-20` (to clear the sidebar) for a full-bleed feel.
  - The `iframe` is wrapped in a glassmorphic container (`bg-black/40 backdrop-blur-xl`).
- **Pros:**
  - Zero-effort UI parity (users get the full, familiar app interface).
  - No API bottlenecking for complex operations like video streaming or document editing.
- **Cons:**
  - Currently hardcoded to `http://192.168.1.68`, which requires dynamic resolution in production.
  - Limited cross-component interaction.

---

## 4. Custom Storage Module (`storage-section.tsx`)

The **Storage File Manager** is a custom React implementation built specifically for Project S to provide a lightweight alternative to full cloud suites for quick file operations.

### 4.1 Key Features
- **File Type Detection:** Extension-based logic assigns colored icons (Orange for PDF/Docs, Purple for MP3, Emerald for Video, Pink for Images).
- **Drag-and-Drop:** Native React `onDrop` handler that updates the file list state instantly when files are dragged into the UI.
- **Search & Filter:** Real-time search functionality that filters the file grid as the user types.
- **UI Design:** Uses a responsive grid of `p-4 rounded-xl` cards with glass effects and hover transitions.

---

## 5. Sidebar & Navigation Routing

The sidebar was updated to support **Section Routing** rather than traditional page navigation to keep the "App" feel within a single-page application.
- **Implementation:** `app/page.tsx` manages a `currentSection` state.
- **Transition:** Switching between "Media," "Nextcloud," and "Storage" triggers a smooth `fade-in slide-in-from-bottom-4` animation while the Aurora background remains static.

---

## 6. The Theia CodeSpace Decision

A strategic decision was made to shift the CodeSpace module from **VS Code Server (Coder)** to **Eclipse Theia**.

- **Why Theia?** While VS Code is MIT, the branded "VS Code" product has proprietary elements and Microsoft-specific restrictions. Theia is a vendor-neutral, **strictly MIT** framework.
- **Advantage:** Theia allows Project S to customize the IDE branding entirely without violating Microsoft's license or trademark policies. It provides a more flexible, customizable development environment for the Project S "Developer" role.

---

## 7. Implementation Record (Manual vs. Generated)

- **Manual Code:**
  - The `StorageSection` file logic and drag-and-drop implementation.
  - Sidebar navigation and section-swapping state machine.
  - Custom glassmorphism styling (`.glass`) and Aurora background system.
- **Generated/Templated Code:**
  - Base shadcn/ui primitives (ScrollArea, Tooltip, DropdownMenu) were used for structural consistency.
  - Initial `MediaSection` and `NextcloudSection` templates.
