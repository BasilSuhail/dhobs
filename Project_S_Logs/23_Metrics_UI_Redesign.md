# Log 23 — Metrics UI Redesign

**Date:** April 8, 2026  
**Author:** BasilSuhail + Qwen-Coder  
**PR:** #146 — `redesign/metrics-ui`  
**Branch:** `redesign/metrics-ui`

---

## Overview

Complete redesign of the metrics page from a cramped, generic dashboard into a professional, data-dense monitoring interface inspired by Datadog and Vercel analytics.

---

## Before → After

| Before | After |
|---|---|
| Dark, chunky tiles with hardcoded `bg-white` | Theme-aware `bg-card` + `border-border` across all 11 themes |
| Fixed-width rows with awkward spacing | Responsive grid, breathing room, sidebar dock clearance (`pl-[88px]`) |
| Large stat cards with oversized icons | Inline stat pills with live sparkline mini-charts |
| Hardcoded `text-gray-900`, `border-gray-100` | Full CSS variable support — adapts to every theme |
| Static gauges showing 0/N/A | Real data: GPU, temperature, disk %, uptime, swap, load, net errors |
| No time range control | 1h / 6h / 24h / 7d selector with dropdown |
| Container cards with hardcoded "UP" badges | Full table with color-coded status, CPU, memory, hover actions |
| Diagnostics in tall empty box | Compact 2×2 grid — swap, load, temp, net health |

---

## Architecture

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Header: Title + Time Range Dropdown                    │
├─────────────────────────────────────────────────────────┤
│  Stat Pills: CPU · Memory · Disk · Uptime · Net ↓↑      │
│  (with inline sparklines for CPU & Memory)              │
├─────────────────────────────────────────────────────────┤
│  CPU & Memory History — Full-width area chart           │
├──────────────────────────────┬──────────────────────────┤
│  Network I/O Chart           │  Storage Breakdown       │
├──────────────────────────────┴──────────────────────────┤
│  System Diagnostics: Swap · Load · Temp · Net Errors    │
├─────────────────────────────────────────────────────────┤
│  Containers Table — Status, CPU, Memory, hover actions  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
/api/stats (5s poll) ──→ live state ──→ stat pills + table
       │
       └──→ history array (in-memory, 5s TTL)
              │
              └──→ charts (120–1344 points based on range)

/api/stats/history (?range=1h|6h|24h|7d) ──→ persisted SQLite
```

### Key Files

| File | Role |
|---|---|
| `components/dashboard/metrics-section.tsx` | Full layout, data fetching, rendering |
| `components/metrics/gauge-cards.tsx` | Gauge components (GPU, temp, CPU, memory) |
| `components/metrics/quick-stats.tsx` | Top bar stat display |
| `components/metrics/system-chart.tsx` | Original area chart (replaced by inline) |
| `components/metrics/network-activity.tsx` | Network chart component |
| `components/metrics/storage-load.tsx` | Storage bar chart |
| `components/metrics/disk-volumes.tsx` | Disk volume bars |
| `components/metrics/node-alerts.tsx` | Container status badges |
| `components/metrics/active-infrastructure.tsx` | Container grid view |
| `components/metrics/system-diagnostics.tsx` | Swap/load/net diagnostics |
| `app/api/stats/route.ts` | Stats API — GPU, temp, disk, swap, load, net errors, container health |
| `app/api/stats/history/route.ts` | History API — SQLite-backed, range-parametric |
| `lib/db/index.ts` | `metrics_history` table schema |

---

## Design Decisions (DO NOT REVERT)

### 1. Theme Compatibility Is Mandatory

Every element uses CSS variables — `bg-card`, `border-border`, `text-foreground`, `bg-secondary/5`. **Never hardcode `bg-white`, `text-gray-900`, `border-gray-100`.** All 11 themes must render correctly.

### 2. Sidebar Dock Clearance

The metrics page has `pl-[88px]` on the root container. This ensures the sidebar dock never overlaps content. **Never remove this padding.** If the sidebar width changes, update this value accordingly.

### 3. Dense, Data-Rich Layout

The design prioritizes data density over whitespace. Stat pills are inline, not chunky cards. Charts have minimal padding. Tables use `text-[11px]`. **Do not add oversized cards or excessive padding.** This is a monitoring tool, not a marketing page.

### 4. Monospace Numbers

All numeric values use `font-mono tabular-nums`. This is intentional — monospace numbers align vertically in tables and feel technical. **Do not change to sans-serif.**

### 5. Sparkline Mini-Charts

CPU and Memory stat pills include inline SVG sparklines showing the last 30 data points. This is a signature design element. **Do not remove.** Add sparklines to other stats as data becomes available.

### 6. Graceful Degradation

Every metric degrades gracefully:
- No GPU → sparkline flat, value shows "—"
- No thermal sensors → "—"
- No swap → "—"
- No network errors → "—"
- macOS dev machine → Docker-only mode, host metrics N/A

**Never show "0" for unavailable data.** Use "—" or "N/A".

### 7. Color Semantics

| Color | Meaning |
|---|---|
| `#22c55e` (green) | Healthy, running, clean |
| `#ef4444` (red) | Unhealthy, exited, errors |
| `#f59e0b` (amber) | Restarting, paused, warning |
| `#0ea5e9` (cyan) | CPU metric color |
| `#8b5cf6` (purple) | Memory metric color |
| `#06b6d4` (teal) | Download/network in |
| `#f43f5e` (rose) | Upload/network out |

### 8. Time Range Picker

The range selector (`1h`, `6h`, `24h`, `7d`) controls how much history is fetched from `/api/stats/history`. The dropdown is a custom component — **do not replace with a native `<select>`.**

### 9. Container Table Hover

Table rows show a `MoreHorizontal` icon on hover (`opacity-0 group-hover:opacity-100`). This is reserved for future actions (logs, restart, shell). **Keep this pattern.**

---

## Metrics Currently Tracked

### Tier 1 — Real-Time (Stat Pills)
- CPU % (aggregate)
- Memory % + GiB used
- Disk usage % (root filesystem)
- System uptime (days)
- Network download/upload (MB/s)

### Tier 2 — Time-Series (Charts)
- CPU & Memory history (area chart)
- Network I/O history (area chart, dual stream)

### Tier 3 — Infrastructure
- Storage breakdown by service (bar chart, % of total)
- Container status table (running/unhealthy/exited/restarting)
- Per-container CPU and memory

### Tier 4 — Diagnostics
- Swap usage (% + bytes)
- Load average (1m, 5m, 15m)
- CPU/GPU/SYS temperature
- Network errors + dropped packets

### Tier 5 — Planned (Not Yet Built)
- [ ] CPU per-core breakdown (stacked bar)
- [ ] Disk I/O chart (read/write throughput)
- [ ] Memory breakdown (used/buffers/cached/free)
- [ ] Container resource leaderboard with sparklines
- [ ] Panel drag/reorder (editable layout)
- [ ] Panel show/hide toggle
- [ ] Export metrics as CSV
- [ ] Alert threshold configuration

---

## API Response Schema

### `GET /api/stats`

```json
{
  "cpu": "12.3",
  "memPerc": "45.6",
  "memBytes": "8.2",
  "netDown": "1.2",
  "netUp": "0.3",
  "storage": [{ "name": "Jellyfin", "size": "1234.5", "bytes": 1294417920 }],
  "containers": [{ "name": "jellyfin", "status": "running", "cpu": "2.1%", "mem": "1.2GiB / 2GiB" }],
  "gpu": { "load": 45, "temp": 62 } | null,
  "temps": { "cpu": 55, "gpu": 62, "sys": 48 } | { "cpu": null, "gpu": null, "sys": null },
  "diskUsedPerc": 72 | null,
  "uptimeDays": 14 | null,
  "swap": { "total": 4294967296, "used": 1073741824, "perc": 25 } | null,
  "loadAvg": { "load1": 0.42, "load5": 0.38, "load15": 0.35 } | null,
  "netErrors": { "rxErrors": 0, "txErrors": 0, "rxDropped": 2, "txDropped": 0 } | null
}
```

### `GET /api/stats/history?range=1h|6h|24h|7d`

```json
[
  {
    "time": "14:30:00",
    "cpu": 12.3,
    "memory": 45.6,
    "gpu": 0,
    "disk": 72,
    "netDown": "1.2",
    "netUp": "0.3"
  }
]
```

---

## Subsequent PRs

### PR #148 — Gap Analysis Phase 1 (Per-Disk, SMART, Power)
**Date:** April 9, 2026 | **Branch:** `metrics/gap-analysis`

From #147 research. Three gaps filled:

| Gap | Source | Display |
|---|---|---|
| Per-disk breakdown | `df -h` per mount | Table with used/total, color-coded % |
| SMART drive health | `smartctl --json --all` | Model, temp, health status |
| Power consumption | Intel RAPL `/sys/class/powercap` | Cumulative kWh |

**New API fields:** `disks[]`, `smart[]`, `power`

### PR #149 — Layout Refinement (70/30 Split)
**Date:** April 9, 2026 | **Branch:** `metrics/chart-layout`

CPU + Network charts stacked left (70%), Storage full-height right column (30%). Equal chart heights (`h-32`). More space-efficient layout.

### PR #150 — Matrix Crash-Loop Fix
**Date:** April 9, 2026 | **Branch:** `fix/external-links`

Matrix server crash-looped with `${MATRIX_DB_USER}` literal text. Fixed with:
- `homeserver.yaml` → `homeserver.yaml.tpl`
- `gen_config.py` — substitutes env vars before starting Synapse
- Custom entrypoint runs gen_config.py → generates real config

**Files:** `config/matrix/homeserver.yaml.tpl`, `config/matrix/gen_config.py`, `docker-compose.yml`

### PR #153 — Backup Status + UPS Monitoring (#147 Phase 2)
**Date:** April 9, 2026 | **Branch:** `metrics/backup-ups`

| Feature | Source | Display |
|---|---|---|
| Backup status | Scans `/data/backups`, `/data/backup`, `/data/.backups` | Time ago + pass/fail badge + size |
| UPS monitoring | `apcaccess` (APC) or `upsc` (NUT) | Battery %, load %, runtime, status |

Both degrade gracefully when unavailable (hidden if no data).

**New API fields:** `backup`, `ups`

---

## Updated Metrics Currently Tracked

### Tier 1 — Real-Time (Stat Pills)
- CPU % (aggregate)
- Memory % + GiB used
- Disk usage % (root filesystem)
- System uptime (days)
- Network download/upload (MB/s)

### Tier 2 — Time-Series (Charts)
- CPU & Memory history (area chart, left column)
- Network I/O history (area chart, left column)
- Time range selector: 1h / 6h / 24h / 7d

### Tier 3 — Infrastructure
- Storage breakdown by service (bar chart, right column)
- Per-disk breakdown table (mount, used/total, %)
- SMART drive health (model, temp, OK/Alert/Dead)
- Container status table (running/unhealthy/exited/restarting)
- Per-container CPU and memory

### Tier 4 — Diagnostics
- Swap usage (% + bytes)
- Load average (1m, 5m, 15m)
- CPU/GPU/SYS temperature
- Network errors + dropped packets
- Power consumption (cumulative kWh)

### Tier 5 — Operational
- Backup status (last run time ago, size, pass/fail badge)
- UPS status (battery %, load %, runtime remaining, online/battery)

### Tier 6 — Planned (Not Yet Built)
- [ ] CPU per-core breakdown (stacked bar)
- [ ] Disk I/O chart (read/write throughput)
- [ ] Memory breakdown (used/buffers/cached/free)
- [ ] Container resource leaderboard with sparklines
- [ ] Panel drag/reorder (editable layout)
- [ ] Panel show/hide toggle
- [ ] Export metrics as CSV
- [ ] Alert threshold configuration

---

## Updated API Response Schema

### `GET /api/stats`

```json
{
  "cpu": "12.3",
  "memPerc": "45.6",
  "memBytes": "8.2",
  "netDown": "1.2",
  "netUp": "0.3",
  "storage": [{ "name": "Jellyfin", "size": "1234.5", "bytes": 1294417920 }],
  "containers": [{ "name": "jellyfin", "status": "running", "cpu": "2.1%", "mem": "1.2GiB / 2GiB" }],
  "gpu": { "load": 45, "temp": 62 } | null,
  "temps": { "cpu": 55, "gpu": 62, "sys": 48 } | null,
  "diskUsedPerc": 72 | null,
  "uptimeDays": 14 | null,
  "swap": { "total": 4294967296, "used": 1073741824, "perc": 25 } | null,
  "loadAvg": { "load1": 0.42, "load5": 0.38, "load15": 0.35 } | null,
  "netErrors": { "rxErrors": 0, "txErrors": 0, "rxDropped": 2, "txDropped": 0 } | null,
  "disks": [{ "device": "/dev/sda1", "mount": "/", "total": "500G", "used": "360G", "avail": "140G", "usePerc": 72 }],
  "smart": [{ "device": "/dev/sda", "model": "Samsung 870 EVO", "temperature": 35, "powerOnHours": 4200, "health": "OK", "reallocated": 0 }],
  "power": { "watts": null, "kwhEstimate": 0.012 },
  "backup": { "lastRun": 1712620800, "lastRunAgo": "2h ago", "success": true, "size": "1.2 GB" } | null,
  "ups": { "batteryPerc": 100, "loadPerc": 15, "runtimeMin": 180, "status": "OL" } | null
}
```

---

## Subsequent PRs (continued)

### PR #161 — Backup System Phase 1 (One-Click Backup & Restore)
**Date:** April 9, 2026 | **Branch:** `feat/snapshot-backup` | **Issue:** #160

From Issue #129 — the #1 user pain point: "tinkering until it breaks, no easy rollback."

**What was built:**
- `GET /api/backup` — list existing backups from `/data/backups/`
- `POST /api/backup` — trigger new tarball backup of `/data`
- `POST /api/backup/restore` — initiate restore from backup
- `backup_history` table in SQLite — tracks filename, size, status, timestamp
- Interactive backup widget in metrics page — "New Backup" button, history list, restore buttons

**Excluded from backup:** backups dir itself, node_modules, .git, .next, *.log, tmp

### PR #162 — Backup UI Fix
**Date:** April 9, 2026 | **Branch:** `fix/backup-ui`

- Fixed cramped "New" button — moved inside backup card with proper spacing
- Simplified tar command — single `tar -czf ... -C / data` with exclusions
- "New Backup" label instead of just "New"

### PR #165 — Metrics 65/35 Layout + Backup API Fix
**Date:** April 9, 2026 | **Branch:** `fix/metrics-final`

- Changed column ratio from 50/50 to 65/35 (left/right)
- Backup API: mounted `/data/backups` as writable volume (was read-only)
- Added tar availability check, stdout/stderr logging, file size verification
- Returns actual error message instead of generic "Backup failed"

### PR #166 — Metrics UX Polish
**Date:** April 9, 2026 | **Branch:** `polish/metrics-ux`

- Loading skeleton states — pulsing placeholder bars while metrics load
- Stat pill tooltips — hover on CPU/Memory/Disk/Uptime/Net for descriptions
- Container row tooltips — hover any row for full details
- Null safety — all stat accesses use optional chaining + fallbacks

### PR #149 — Metrics Layout Refinement (70/30)
**Date:** April 9, 2026 | **Branch:** `metrics/chart-layout`

- CPU chart + Network chart stacked left column (70%)
- Storage panel full-height right column (30%)
- Equal chart heights (`h-32`) for visual alignment
- More space-efficient layout with breathing room

---

## Future Work

See Issue #145 (Metrics UI Overhaul) and Issue #144 (Dashboard UI Overhaul).

**This page is the definitive metrics interface. Any new stats added must follow the existing design language — stat pills, monospace numbers, theme variables, and dense layout.**

---

*End of Log 23*
