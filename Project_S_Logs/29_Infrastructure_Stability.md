# 29 — Infrastructure Stability & Cross-Platform Metrics

**Date:** April 12, 2026  
**Author:** Author  
**PRs:** #197 (Metrics), #200 (Self-Healing Script)  

---

## Context
Following the "Brutal Audit" (#198), we prioritized stability and user experience. The previous infrastructure was fragile (scripts crashed on missing files) and limited (macOS/Windows showed "N/A" for metrics).

## Changes Made

### 1. Self-Healing Startup Script
Rewrote `boom.sh` to be bulletproof.
- **Auto-Repairs Configs:** Automatically creates missing config files (e.g., Collabora, Matrix).
- **Secrets Management:** If `data/secrets/` is missing, it generates random secrets automatically.
- **Log/File Repair:** Fixes broken directories (e.g., if Docker creates a directory instead of a log file).
- **Port Checks:** Verifies port availability before starting.

### 2. Cross-Platform Metrics (Linux)
Added real host metrics for Linux users.
- **Mounts:** Added `/proc` and `/sys` read-only mounts.
- **API:** Updated stats API to read from `/host/proc` for real CPU/RAM/Temp data.

### 3. Host Agent (macOS/Windows)
Created `scripts/host-agent.js` to read host stats on non-Linux platforms.
- **Note:** Currently requires manual execution (`node scripts/host-agent.js`). Future goal is a compiled binary.

### 4. Docker Secrets Integration
Standardized secrets for all services (MariaDB, Synapse, Collabora, etc.) using Docker Secrets to avoid environment variable exposure.

## Impact
- **Reliability:** `boom.sh` now works on a fresh clone without manual intervention.
- **Parity:** Linux users finally see accurate system stats.
- **Security:** Secrets are now mounted as files, not exposed in `docker inspect`.

---

*End of Log 29*
