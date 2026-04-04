# Terminal Redesign: HomeForge

## Architecture
Browser (xterm.js) ←──WebSocket──→ Custom server (ws + node-pty) ←──PTY──→ /bin/bash

Each terminal tab = one WebSocket connection = one node-pty bash process. Close the tab → kill the pty.

---

## New Files
| File | Purpose |
|------|---------|
| `custom-server.ts` | Custom Next.js + WebSocket server |
| `tsconfig.server.json` | Separate tsconfig to compile `custom-server.ts` → `custom-server.js` |

## Modified Files
| File | Change |
|------|--------|
| `Dockerfile` | Alpine → Debian slim; add build tools for node-pty; change CMD |
| `terminal-panel.tsx` | Replace custom input/output with xterm.js instances + WebSocket |
| `package.json` | Add node-pty, ws, @types/ws |
| `next.config.mjs` | No change needed |

## Deleted Files
| File | Reason |
|------|--------|
| `lib/terminal-engine.ts` | Replaced entirely by real shell |

---

## Data Flow
1. **Tab opens** → `terminal-panel.tsx` creates xterm Terminal instance, connects WebSocket to `ws://[host]:3069/ws/terminal`
2. **Server receives WS upgrade** → spawns `pty.spawn('/bin/bash')` with `xterm-256color`
3. **User types** → xterm sends `{ type: 'input', data: '...' }` → server writes to pty stdin
4. **Pty outputs** → server sends raw string → xterm renders (full ANSI support natively)
5. **Terminal resizes** → xterm sends `{ type: 'resize', cols, rows }` → server calls `pty.resize()`
6. **Tab closes / WS disconnect** → server calls `pty.kill()`

---

## Status Update (COMPLETED)
- **Debian Base:** Dashboard now runs on `node:20-slim`, enabling `apt` package manager support.
- **Native PTY:** Real shell access via `node-pty` with full ANSI/VT100 support.
- **WebSocket Backend:** Custom Next.js server handles real-time terminal traffic.
- **Xterm.js Frontend:** Professional terminal emulation with multi-tab support.
- **Verified:** Tested with `apt update`, `docker ps`, and multi-tab isolation.

---

## Deployment
Rebuild and launch with:
```bash
docker compose build dashboard
docker compose up -d dashboard
```

---

## Phase 2: Terminal Integration & Unity (PR #90 — Issue #89)

**Date:** 2026-04-04

### Problems Fixed

| # | Issue | Root Cause |
|---|-------|------------|
| 1 | `ws://` hardcoded — breaks over HTTPS | No protocol detection |
| 2 | Ollama tab showed no context about which container was connected | Server sent no banner or title |
| 3 | Stale closure in `closeTab` | `tabs` state passed as a workaround param instead of functional updater |
| 4 | Sessions destroyed on panel close/reopen | `if (!open) return null` unmounted entire component tree |
| 5 | No way to exec into a container from the dashboard | No integration between service tiles and terminal |
| 6 | Tab titles static — never updated from the shell | `onTitleChange` not wired |

### Solutions

**Fix 1 — Protocol detection**
`terminal-panel.tsx` now checks `window.location.protocol` and uses `wss://` when served over HTTPS.

**Fix 2 — Context clarity for shell tabs**
`custom-server.ts` sends an OSC title sequence (`\x1b]0;<name>\x07`) on connect so xterm.js picks it up as the tab title automatically. A `[connected to <container>]` banner is also written to the terminal.

**Fix 3 — Stale closure**
`closeTab` now uses a functional `setTabs(prev => ...)` updater. No longer requires `tabs` to be passed as a parameter from the render.

**Fix 4 — Session persistence**
Added a `hasEverOpened` ref. Once the panel opens for the first time, it stays in the DOM permanently. Closing the panel now uses `transform: translateY(100%)` (CSS off-screen) instead of unmounting — WebSocket connections and pty sessions survive.

**Fix 5 — Exec into container from tiles**
- Each container card in the "Active Infrastructure" section of the Dashboard now has a terminal icon button.
- Clicking it sets `execTarget` in `page.tsx`, opens the terminal panel, and `TerminalPanel` opens a new tab with `?shell=container&container=<name>` connecting to that container via `docker exec -it`.
- `custom-server.ts` validates the container is running before spawning. Returns an error message if not.
- New `container` shell type with a distinct `<Container />` icon in the tab bar.

**Fix 6 — Dynamic tab titles**
`TerminalInstance` wires `terminal.onTitleChange` (xterm.js built-in) to a callback that updates tab title state in the parent. Works for all tab types.

### Updated Architecture

```
Browser (xterm.js) ←─ ws/wss ─→ Custom WS server ←─ PTY ─→ shell context
                                       │
                              ?shell=ollama    → docker exec -it project-s-ollama /bin/sh
                              ?shell=container → docker exec -it <container> /bin/sh
                              (default)        → docker exec -it project-s-theia /bin/bash
                                                 (fallback: /bin/bash on host)
```

Panel lifecycle:
- First open → mount, create WS + pty
- Close → `translateY(100%)`, sessions stay alive
- Reopen → slide back, re-fit active terminal, sessions intact

### Modified Files

| File | Change |
|------|--------|
| `custom-server.ts` | Add `?shell=container&container=<name>` support, container running check, OSC title on connect |
| `components/dashboard/terminal-panel.tsx` | All 6 fixes above |
| `components/dashboard/dashboard-section.tsx` | Terminal exec button on each container tile |
| `app/page.tsx` | `execTarget` state wired between `DashboardSection` and `TerminalPanel` |
