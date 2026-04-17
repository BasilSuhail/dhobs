# 58 — Host Agent Auto-Start (Issue #245)

**Date:** April 17, 2026
**Issue:** `#245`
**Branch:** `feat/host-agent-autostart-245`
**Status:** ⏳ PR Open

---

## Problem

Host Agent required manual execution. On reboot, dashboard lost host metrics (CPU, RAM, Disk) until user manually restarted agent.

---

## What Was Already Implemented

`agent/main.go` had full implementation across all 3 platforms:

| Platform | Mechanism | Flag |
|----------|-----------|------|
| macOS | launchd (`~/Library/LaunchAgents/com.homeforge.agent.plist`) | `--install-service` |
| Linux | systemd (`/etc/systemd/system/homeforge-agent.service`) | `--install-service` (root) |
| Windows | schtasks (`HomeForge Host Agent`, SYSTEM, onstart) | `--install-service` |

README at lines 282–291 already documented the flags. Issue #245 was verification + roadmap promotion.

---

## Verification (macOS, Darwin 24.6.0)

```
$ ./homeforge-agent --install-service
2026/04/17 14:01:16 LaunchAgent installed. Port :9101 already busy, skipping immediate start.

$ cat ~/Library/LaunchAgents/com.homeforge.agent.plist
# plist present — Label, ProgramArguments, RunAtLoad=true, KeepAlive=true

$ launchctl list | grep homeforge
-    1    com.homeforge.agent   # loaded, port busy = not started (correct)

$ ./homeforge-agent --uninstall-service
2026/04/17 14:01:33 LaunchAgent removed from ~/Library/LaunchAgents/com.homeforge.agent.plist

$ launchctl list | grep homeforge
# (no output — service removed)
```

Both paths confirmed working. `RunAtLoad=true` + `KeepAlive=true` = survives reboot and crash.

---

## Files Changed

- `Project_S_Logs/58_Host_Agent_Autostart.md` (this file)
- `Project_S_Logs/00_Master_Implementation_Plan.md` (roadmap updated)
