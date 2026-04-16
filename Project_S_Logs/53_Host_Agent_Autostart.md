# Host Agent Auto-Start

**Date:** April 16, 2026  
**Issue:** `#228`  
**Branch:** `feat/host-agent-autostart-228`  
**Status:** ✅ Done

---

## Problem

Host agent lives, but not persist.

After reboot:
- metrics die
- dashboard loses host data
- user must restart agent by hand or via `boom.sh`

---

## Scope Questioning

True 3-OS auto-start is easy to fake.
Need smallest real slice.

Chosen shape:
- macOS: LaunchAgent
- Linux: systemd system service
- Windows: Task Scheduler `ONSTART`

Reason:
- real OS-native persistence
- no external dependency manager
- one binary command path

---

## CLI

```bash
./homeforge-agent --install-service
./homeforge-agent --uninstall-service
```

Behavior by OS:
- macOS installs plist into user LaunchAgents
- Linux installs systemd unit into `/etc/systemd/system`
- Windows creates scheduled task named `HomeForge Host Agent`

---

## Files Changed

- `agent/main.go`
- `agent/init/launchd.plist.tpl`
- `agent/init/systemd.service.tpl`
- `agent/README.md`
- `README.md`

---

## Implementation

### New flags

```bash
./homeforge-agent --install-service
./homeforge-agent --uninstall-service
```

### macOS

- installs `~/Library/LaunchAgents/com.homeforge.agent.plist`
- uses `launchctl load -w`
- uses user LaunchAgent
- starts on login

### Linux

- installs `/etc/systemd/system/homeforge-agent.service`
- runs `systemctl daemon-reload`
- runs `systemctl enable`
- starts immediately only if port `9101` is free

### Windows

- creates scheduled task `HomeForge Host Agent`
- uses `schtasks`
- trigger: `ONSTART`
- run-as: `SYSTEM`

### Safety

- if port `9101` already busy, install still succeeds
- service is registered
- immediate start is skipped
- this avoids failing when manual agent already running

---

## Validation

- `go build ./...` — pass
- `make test` — pass
  Smoke test noisy when port `9101` already occupied by existing agent, but health and metrics checks still returned OK.
- macOS `make build` — pass
- macOS `./homeforge-agent --install-service` — pass
- macOS plist created — pass
- macOS `./homeforge-agent --uninstall-service` — pass
- macOS plist removed — pass

---

## Notes

Windows path least trusted.
Will use official `schtasks /create` `ONSTART` flow.

Linux install will require root.
macOS install will be user-level, no root.

Linux and Windows command paths implemented, but not live-run on this macOS host.
