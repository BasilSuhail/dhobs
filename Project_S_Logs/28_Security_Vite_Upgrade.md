# Log 28 — Security: Vite Dependency Upgrade

**Date:** April 9, 2026  
**Author:** BasilSuhail + Qwen-Coder  
**PR:** #170  
**Issue:** #169

---

## Overview

Upgraded Vite from 7.3.1 to 7.3.2 to resolve 3 Dependabot security alerts. All were development-only vulnerabilities with zero production impact.

---

## Vulnerabilities Fixed

| Alert | Severity | CVE/Reference | Description |
|---|---|---|---|
| Arbitrary File Read via WebSocket | High | GHSA-xxxx-xxxx-xxxx | Vite dev server WebSocket could read arbitrary files |
| `server.fs.deny` bypass | High | GHSA-xxxx-xxxx-xxxx | Query parameters bypass file access restrictions |
| Path Traversal in `.map` files | Moderate | GHSA-xxxx-xxxx-xxxx | Optimized deps `.map` handling allows path traversal |

---

## Impact Assessment

| Question | Answer |
|---|---|
| **Affected environment?** | Development only |
| **Production at risk?** | No — Next.js 16.2.0 with Turbopack, not Vite |
| **Users affected?** | None — only developers running `pnpm dev` or `pnpm test:watch` |
| **Data at risk?** | Local filesystem files accessible to dev machine |
| **Exploit vector?** | Malicious code in the codebase itself (supply chain) |

---

## Technical Details

**Before:**
```json
// package.json
"devDependencies": {
  "vitest": "^3.0.0"
}
// pnpm-lock.yaml → vite@7.3.1 (transitive via vitest)
```

**After:**
```json
// package.json
"devDependencies": {
  "vite": "^7.3.2",
  "vitest": "^3.0.0"
}
// pnpm-lock.yaml → vite@7.3.2
```

Adding `"vite"` as an explicit devDependency overrides the transitive version pulled by `vitest`, forcing 7.3.2.

---

## Resolution

- Added `"vite": "^7.3.2"` to `devDependencies`
- Updated `pnpm-lock.yaml` to resolve all vite references to 7.3.2
- Dependabot alerts #7, #9, #11 will auto-close on merge

---

## Key Files

| File | Change |
|---|---|
| `Dashboard/Dashboard1/package.json` | Added `"vite": "^7.3.2"` to devDependencies |
| `Dashboard/Dashboard1/pnpm-lock.yaml` | Resolved `vite@7.3.1` → `vite@7.3.2` throughout |

---

*End of Log 28*
