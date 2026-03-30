# Terminal Redesign: HomeForge (COMPLETED)

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
