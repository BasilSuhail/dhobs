# Log 27 — Dock UX: Bounce, Floating Windows, Minimize

**Date:** April 9, 2026  
**Author:** BasilSuhail + Qwen-Coder  
**PRs:** #156, #157  
**Issue:** #112 (Dock UX — app launch animation, floating windows)

---

## Overview

Implemented macOS-style dock UX for the HomeForge dashboard sidebar. App icons bounce on launch, show active indicators, and open internal apps (Ollama, Kiwix, Metrics) as floating windows that can be minimized to the dock and restored.

---

## PR #156 — Phase 1: Bounce Animation + Active Dot

### What was built

**Bounce animation:**
- CSS keyframes: `@keyframes bounce-dock` — 3-cycle translateY animation over 600ms
- Triggered on dock icon click via React state (`bouncingId`)
- Auto-resets after animation completes

**Active dot indicator:**
- Small accent-colored dot below each active sidebar icon
- Full opacity when app is open, 40% opacity when minimized
- Hidden when app is closing

### Files Changed
- `components/dashboard/sidebar.tsx` — bounce state, dot rendering, `handleBounceClick`
- `app/page.tsx` — `@keyframes bounce-dock` CSS animation

---

## PR #157 — Phase 2: Floating Windows System

### What was built

**Floating windows:**
- Internal apps (Ollama, Kiwix) open as floating panels over the home dashboard
- Title bar with app icon, name, minimize (−), and close (×) buttons
- Home section stays visible behind open windows
- Multiple windows can be open simultaneously with z-index stacking

**Window management:**
- `ActiveWindow` interface with `id`, `name`, `icon`, `component`, `zIndex`, `isMinimized`, `isClosing`
- `openApp()` — opens new window, or restores minimized one, brings to front
- `closeApp()` — fade-out animation (400ms), then unmounts
- `minimizeApp()` — hides window, keeps state, shows dot in dock
- `bringToFront()` — increments z-index, clicked window comes to front

**Dock behavior:**
- Click dock icon while app is open → minimize to dock
- Click minimized app → restore and bring to front
- Click app while closing → reopen immediately

**Layout:**
- Windows use `top: 16px, bottom: 16px, left: 104px, right: 16px` — edge-to-edge with margins
- `zIndex: 1000` ensures windows are above all content
- Content area `overflow-hidden` prevents scroll spillover

### Files Changed
- `app/page.tsx` — full window management system (open, close, minimize, z-index)

---

## Key Files

| File | Purpose |
|---|---|
| `components/dashboard/sidebar.tsx` | Bounce animation, active dot, dock interaction |
| `app/page.tsx` | Window state management, floating panels, open/close/minimize |

---

*End of Log 27*
