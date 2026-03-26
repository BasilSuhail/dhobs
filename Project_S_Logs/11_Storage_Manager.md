# Project S — Custom Storage Manager Log

This document details the implementation of the bespoke Storage File Manager, a native UI component for high-speed file manipulation within Project S.

---

## 1. Implementation Goal

* To provide a lightweight, native alternative to heavy cloud suites for common file tasks.
* To enable drag-and-drop uploads directly from the dashboard.
* To offer real-time search and categorization of local system files.

## 2. Component Architecture

The Storage Manager is a "Section" component (`storage-section.tsx`) built using the Project S Design System.

* **UI Layer:** Next.js + Tailwind CSS 4.0.
* **Primitives:** shadcn/ui (ScrollArea, Dropdown, Input).
* **Icons:** Lucide-react (Dynamic assignment based on file mime-types).
* **Animations:** Framer Motion-inspired CSS transitions for drag states and hover effects.

## 3. Key Features

* **Advanced File Mapping:**
    * **Documents:** Orange icons (pdf, doc, txt).
    * **Media:** Purple icons (mp3, wav) / Emerald icons (mp4, mov).
    * **Images:** Pink icons (jpg, png, gif).
* **Drag-and-Drop:** Native browser API integration with visual "Drop Zone" overlays.
* **System Stats:** Real-time capacity monitoring (Total vs. Used) displayed via progress bars.

## 4. Technical Record

* **State Management:** Uses React `useState` for local file list caching and search query filtering.
* **Styling:** Adheres strictly to the **Blackboard** theme (Primary Accent: `#d4e157`).
* **Section Routing:** Managed by `app/page.tsx` using conditional rendering to ensure the background aurora remains consistent.

## 5. Credits & Licenses

* **shadcn/ui:** Component architecture — **MIT License**.
* **Lucide:** Iconography — **ISC License**.
* **Radix UI:** Primitive accessibility — **MIT License**.
* **Tailwind CSS:** Styling engine — **MIT License**.
* **Implementation:** Saad Shafique (@saadsh15).
