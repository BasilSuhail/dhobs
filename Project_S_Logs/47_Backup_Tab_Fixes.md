# 47 — Backup Tab Frontend Fixes (Issue #212)

**Date:** April 14, 2026  
**Author:** Basil Suhail  
**Related Issue:** #212  
**PR:** #213  
**Branch:** `feat/backup-tab-fix`  
**Status:** ✅ Ready for merge

---

## Context

The backup tab (`backup-section.tsx`) had 6 frontend bugs left by the original implementation:

1. **Restore modal** — truncated in code (`...` placeholder), did not render at all
2. **Restore logs tab** — `fetchRestoreLogs()` was an empty no-op function
3. **Service selection** — checkbox logic existed but no visual feedback for the user
4. **Polling memory leak** — `setInterval` ran forever even when tab unmounted or browser was hidden
5. **Error display** — failed backup errors were cut off by narrow table column
6. **Hardcoded padding** — `pl-[88px]` broke on screens smaller than desktop

---

## Fixes Applied

### 1. Restore Modal
**Before:** JSX was just `...` — the modal literally did not exist in the render tree.

**After:** Full confirmation modal matching the Delete modal pattern:
- `RotateCcw` icon with emerald styling
- Clear warning text about data overwrite
- "Yes, Restore Now" and "Cancel" buttons
- Calls `handleRestore(jobId)` which POSTs to `/api/backup/restore`

### 2. Restore Logs Tab
**Before:** `fetchRestoreLogs` was an empty arrow function with a TODO comment.

**After:** Fetches `/api/backup/restore-logs` and renders rows with:
- Job ID, timestamp, services, status
- Success/error indicators
- Error messages with tooltip

### 3. Service Selection
**Before:** Invisible checkbox toggle with no visual state.

**After:** Visual toggle buttons with two states:
- **Active:** `bg-emerald-500/20 text-emerald-400 border-emerald-500/30`
- **Inactive:** `bg-secondary/10 text-foreground/30 border-border`
- "All Services" pill + individual service pills
- Click to toggle inclusion

### 4. Polling Memory Leak
**Before:** `setInterval(fetchBackups, 3000)` ran forever, even when:
- User navigated away from backup tab
- Browser tab was minimized/hidden
- Component was unmounted

**After:** Three-layer protection:
- `isVisibleRef` checked before each fetch
- `visibilitychange` listener pauses polling when tab is hidden
- Cleanup in `useEffect` return: `clearInterval(pollRef.current)`

### 5. Error Display
**Before:** Error text shown inline in Actions column, cut off by narrow width.

**After:** Error displayed below status badge with:
- `text-[9px]` for compact rendering
- `truncate` to prevent overflow
- `title={b.error}` for hover tooltip
- `max-w-[150px]` constraint

### 6. Responsive Layout
**Before:** Hardcoded `pl-[88px]` — fine on desktop, broke on tablets.

**After:** `pl-20 lg:pl-[88px]` — responsive padding with:
- `pl-20` (5rem) for mobile/tablet
- `pl-[88px]` for desktop (`lg:` breakpoint)
- Consistent responsive spacing on all containers (`p-4 lg:p-6`, `px-4 lg:px-6`, `gap-4 lg:gap-6`)

---

## Files Changed

| File | Change |
|------|--------|
| `components/dashboard/backup-section.tsx` | Full rewrite — all 6 fixes, responsive, restore modal, restore logs, polling cleanup, service selection UI |

---

## Acceptance Criteria
- [x] Restore modal renders with confirmation flow
- [x] Restore logs tab fetches and displays data
- [x] Service selection has visual feedback (toggle buttons)
- [x] Polling cleans up on unmount + pauses when tab hidden
- [x] Error messages fully visible (truncate + tooltip)
- [x] Responsive layout (no hardcoded padding)
- [x] TypeScript compiles cleanly
