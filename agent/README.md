# HomeForge Host Agent

Statically-linked binary that exposes host metrics on `:9101`.  
Replaces `scripts/host-agent.js`. Zero runtime dependencies.

## Build

```bash
# Install Go — https://go.dev/dl or: brew install go
cd agent
make all          # build for current platform
make release      # cross-compile all targets → dist/
```

## Run

```bash
./homeforge-agent
# Metrics:  http://localhost:9101/metrics
# Health:   http://localhost:9101/health
```

To stop manual run:

```bash
# same terminal
Ctrl+C
```

## Service Install

```bash
./homeforge-agent --install-service
./homeforge-agent --uninstall-service
```

| Platform | Install Target | Notes |
|--------|--------|--------|
| macOS | `~/Library/LaunchAgents/com.homeforge.agent.plist` | User LaunchAgent, starts on login |
| Linux | `/etc/systemd/system/homeforge-agent.service` | Requires root, starts on boot |
| Windows | Task Scheduler: `HomeForge Host Agent` | Requires elevated shell, starts on boot |

Logs:
- macOS / Linux: `/tmp/homeforge-agent.log`
- Windows: Task Scheduler history / task last-run result

## Endpoints

| Endpoint   | Response                          |
|------------|-----------------------------------|
| `GET /metrics` | Full JSON metrics (cached 2s) |
| `GET /health`  | `{"status":"ok","platform":"..."}` |

## Platforms

| Target | Binary |
|--------|--------|
| Linux amd64 | `dist/homeforge-agent-linux-amd64` |
| Linux arm64 | `dist/homeforge-agent-linux-arm64` |
| Linux armv7 | `dist/homeforge-agent-linux-armv7` |
| macOS amd64 | `dist/homeforge-agent-darwin-amd64` |
| macOS arm64 | `dist/homeforge-agent-darwin-arm64` (Apple Silicon) |
| Windows amd64 | `dist/homeforge-agent-windows-amd64.exe` |
