# Project S — Custom Storage Manager Log

This document records the implementation of the native Storage File Manager for Project S, providing a high-performance, lightweight interface for direct local file manipulation.

---

## 1. Goal: Native, Ultra-Fast File Management

While suites like Nextcloud are powerful, a native file explorer is essential for rapid file tasks (Upload, Delete, Rename) directly within the Dashboard without leaving the Project S context. The goal was to build a fast, drag-and-drop-enabled UI that adheres to the Project S Design System.

---

## 2. Component Architecture (`storage-section.tsx`)

The Storage Manager is a sophisticated React component built using the Project S Blackboard theme (`#d4e157` accent) and modern UI primitives.

### 2.1 File Mapping & Visualization

The component uses a custom `getFileIcon` function to provide instant visual feedback based on file types.

| Category | File Extensions | Icon | Accent Color |
| :--- | :--- | :--- | :--- |
| **Documents** | `pdf, doc, docx, txt` | `FileText` | Orange-400 |
| **Images** | `jpg, jpeg, png, gif` | `ImageIcon` | Pink-400 |
| **Audio** | `mp3, wav` | `Music` | Purple-400 |
| **Video** | `mp4, mov` | `Video` | Emerald-400 |
| **Folders** | N/A | `Folder` | Blue-400 |

### 2.2 UI Stack & Primitives

- **Framework:** Next.js 15 + React 19 (Client Component).
- **Styling:** Tailwind CSS 4.0.
- **Components:** shadcn/ui (`ScrollArea`, `Button`, `Input`, `DropdownMenu`).
- **Iconography:** Lucide-react for high-consistency 24x24 icons.

---

## 3. Data & File Structure

The Storage Manager is a standalone component within the Dashboard frontend.

### 3.1 Repository Mapping

```text
OpenSource HomeLabbing/
└── Dashboard/Dashboard1/
    ├── app/
    │   └── page.tsx            ← Root layout with section routing
    └── components/dashboard/
        └── storage-section.tsx ← Main React component for file management
```

### 3.2 Mock Filesystem Implementation

The Storage Manager maintains a local `FileItem` state to simulate a real-world filesystem environment.

```text
Root/ (Mock)
├── Documents/ (Folder)
├── Images/ (Folder)
├── Project_Proposal.pdf (File)
├── System_Logs.txt (File)
├── Hero_Banner.jpg (File)
└── Background_Music.mp3 (File)
```

---

## 4. Key Implementation Features

### 4.1 Drag-and-Drop Infrastructure
The Storage Manager implements the **Native HTML5 Drag and Drop API** for a seamless file-handling experience.
- **States:** `onDragOver` and `onDragLeave` manage the visual "Drop Zone" overlay.
- **Interaction:** A bouncing `Upload` icon and `backdrop-blur-sm` overlay provide feedback on drop-ready state.
- **Logic:** `onDrop` captures the file objects and updates the local state in real-time.

### 4.2 Real-Time Search & Filtering
- **Query State:** `searchQuery` filters the `files` array using `toLowerCase()` matching.
- **Breadcrumb Navigation:** A navigation toolbar (Root > Home) ensures spatial orientation.

### 4.3 Resource Monitoring Grid
At the top of the section, a 4-column grid provides real-time (simulated) capacity stats:
- **Total Capacity:** 2 TB (Theia shared volume).
- **Used Space:** 456 GB (Actual disk usage).
- **Categorized Counts:** Documents vs. Media counts.

---

## 5. Collaborative Contributions (`Contributor`)

- **UI Development:** Saad built the entire `storage-section.tsx` component, ensuring it matched the Project S design tokens.
- **State Management:** Implemented the `useState` and `useCallback` hooks for file list and drag states.
- **Theme Sync:** Integrated the `useTheme` hook for dynamic accent color support.
- **Search Logic:** Engineered client-side search filtering for zero-latency discovery.

---

## 6. Iteration History

| Version | Date | Changes |
|---|---|---|
| v1 | 2026-03-24 | Initial UI scaffold with mock file list and grid stats |
| v2 | 2026-03-25 | Implemented HTML5 Drag and Drop with visual drop-zone overlay |
| v3 | 2026-03-26 | Integrated theme provider for dynamic accent colors |

---

## 7. Next Steps

- [ ] Connect the `onDrop` and `onDelete` handlers to a backend `fs` API.
- [ ] Implement multi-file selection and bulk operations.
- [ ] Add right-click context menu for advanced file manipulation.

---

## 8. Credits & Reference

- **shadcn/ui:** For the robust component foundations.
- **Lucide:** For the clean, consistent iconography.
- **Implementation:** Contributor (@Contributor).
- **Reference:** Task 5 in `Project_S_Roadmap.md`.

**Status:** Completed (v1.0).
