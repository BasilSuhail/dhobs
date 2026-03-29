export interface ShellState {
  cwd: string
  env: Record<string, string>
  history: string[]
}

export const FILESYSTEM: Record<string, string[]> = {
  "/": ["home", "etc", "var", "usr", "tmp", "opt"],
  "/home": ["user"],
  "/home/user": ["documents", "projects", ".config", ".bashrc"],
  "/home/user/documents": ["notes.txt", "readme.md"],
  "/home/user/projects": ["project-s", "homelab"],
  "/home/user/projects/project-s": ["docker-compose.yml", "README.md", "src", "config"],
  "/home/user/projects/project-s/src": ["main.go", "server.go", "handlers.go"],
  "/home/user/projects/project-s/config": ["app.toml", "nginx.conf"],
  "/etc": ["nginx", "docker", "hosts", "resolv.conf"],
  "/var": ["log", "lib", "docker"],
  "/var/log": ["syslog", "auth.log", "nginx"],
  "/var/docker": ["containers", "images", "volumes"],
  "/opt": ["project-s"],
}

export const FILE_CONTENTS: Record<string, string> = {
  "/home/user/.bashrc": 'export PATH="$HOME/.local/bin:$PATH"\nexport EDITOR=nvim\nalias ll="ls -la"\nalias dc="docker compose"',
  "/home/user/documents/notes.txt": "Project S Development Notes\n===========================\n- Phase 1: Dashboard prototype\n- Phase 2: Docker orchestration\n- Phase 3: App store module",
  "/home/user/documents/readme.md": "# Home Lab Setup\n\nRunning Project S on Raspberry Pi 5.\nAll services behind Authelia SSO.",
  "/home/user/projects/project-s/docker-compose.yml": "version: '3.8'\nservices:\n  dashboard:\n    image: project-s/dashboard:latest\n    ports:\n      - '5111:3069'\n    restart: unless-stopped\n  jellyfin:\n    image: jellyfin/jellyfin:latest\n    ports:\n      - '8096:8096'\n    volumes:\n      - media:/media\n  authelia:\n    image: authelia/authelia:latest\n    ports:\n      - '9091:9091'",
  "/home/user/projects/project-s/README.md": "# Project S\n\nA unified, self-hosted operating system for the home server.",
  "/etc/hosts": "127.0.0.1    localhost\n192.168.1.10 dashboard.local\n192.168.1.10 jellyfin.local\n192.168.1.10 auth.local",
  "/etc/resolv.conf": "nameserver 192.168.1.1\nnameserver 1.1.1.1",
}

export const DOCKER_PS = `CONTAINER ID   IMAGE                        STATUS          PORTS                    NAMES
a1b2c3d4e5f6   project-s/dashboard:latest   Up 2 hours      0.0.0.0:5111->3069/tcp   project-s-dashboard-1
f6e5d4c3b2a1   jellyfin/jellyfin:latest      Up 2 hours      0.0.0.0:8096->8096/tcp   project-s-jellyfin-1
1a2b3c4d5e6f   authelia/authelia:latest       Up 2 hours      0.0.0.0:9091->9091/tcp   project-s-authelia-1
6f5e4d3c2b1a   pihole/pihole:latest          Up 5 days       0.0.0.0:53->53/tcp       pihole
b1c2d3e4f5a6   portainer/portainer-ce        Up 5 days       0.0.0.0:9443->9443/tcp   portainer
d4e5f6a1b2c3   homeassistant/home-assistant  Up 12 hours     0.0.0.0:8123->8123/tcp   homeassistant`

export const DOCKER_IMAGES = `REPOSITORY                       TAG       SIZE
project-s/dashboard              latest    245MB
jellyfin/jellyfin                latest    512MB
authelia/authelia                latest    89MB
pihole/pihole                    latest    298MB
portainer/portainer-ce           latest    156MB
homeassistant/home-assistant     latest    1.2GB
nginx                            alpine    42MB
postgres                         16        412MB`

export const DOCKER_STATS = `CONTAINER ID   NAME                        CPU %   MEM USAGE / LIMIT     NET I/O           BLOCK I/O
a1b2c3d4e5f6   project-s-dashboard-1       0.3%    128MiB / 8GiB         12kB / 8kB        0B / 0B
f6e5d4c3b2a1   project-s-jellyfin-1        1.2%    384MiB / 8GiB         1.2MB / 45MB      12MB / 0B
1a2b3c4d5e6f   project-s-authelia-1        0.1%    32MiB / 8GiB          4kB / 2kB         0B / 0B
6f5e4d3c2b1a   pihole                      0.2%    64MiB / 8GiB          128kB / 96kB      4MB / 0B
b1c2d3e4f5a6   portainer                   0.4%    96MiB / 8GiB          8kB / 4kB         8MB / 0B
d4e5f6a1b2c3   homeassistant               2.1%    512MiB / 8GiB         256kB / 128kB     24MB / 0B`

export function resolveDir(cwd: string, target: string): string | null {
  if (target === "~") return "/home/user"
  if (target === "..") {
    const parts = cwd.split("/").filter(Boolean)
    parts.pop()
    return "/" + parts.join("/")
  }
  if (target === ".") return cwd
  if (target.startsWith("/")) return FILESYSTEM[target] ? target : null
  if (target.startsWith("~/")) {
    const resolved = "/home/user/" + target.slice(2)
    return FILESYSTEM[resolved] ? resolved : null
  }
  const resolved = cwd === "/" ? "/" + target : cwd + "/" + target
  return FILESYSTEM[resolved] ? resolved : null
}

export function processCommand(input: string, state: ShellState): { output: string; newCwd: string } {
  const trimmed = input.trim()
  if (!trimmed) return { output: "", newCwd: state.cwd }

  state.history.push(trimmed)
  const parts = trimmed.split(/\s+/)
  const cmd = parts[0]
  const args = parts.slice(1)

  switch (cmd) {
    case "help":
      return {
        output: `Available commands:
  ls [dir]          List directory contents
  cd <dir>          Change directory
  pwd               Print working directory
  cat <file>        Display file contents
  clear             Clear terminal
  echo <text>       Print text
  whoami            Current user
  hostname          Show hostname
  uname [-a]        System information
  uptime            System uptime
  date              Current date/time
  docker <cmd>      Docker commands (ps, images, stats)
  neofetch          System info display
  ping <host>       Ping a host
  history           Command history
  env               Environment variables
  export K=V        Set environment variable
  help              Show this help message`,
        newCwd: state.cwd,
      }

    case "ls": {
      const target = args[0] ? resolveDir(state.cwd, args[0]) ?? args[0] : state.cwd
      const showAll = args.includes("-a") || args.includes("-la") || args.includes("-al")
      const showLong = args.includes("-l") || args.includes("-la") || args.includes("-al")
      const dirTarget = args.filter(a => !a.startsWith("-"))[0]
      const resolvedTarget = dirTarget ? resolveDir(state.cwd, dirTarget) ?? dirTarget : state.cwd
      const entries = FILESYSTEM[resolvedTarget]
      if (!entries) return { output: `ls: cannot access '${dirTarget || resolvedTarget}': No such file or directory`, newCwd: state.cwd }
      let items = [...entries]
      if (showAll) items = [".", "..", ...items]
      if (showLong) {
        const lines = items.map(item => {
          const isDir = FILESYSTEM[resolvedTarget === "/" ? "/" + item : resolvedTarget + "/" + item]
          const perms = isDir ? "drwxr-xr-x" : "-rw-r--r--"
          const size = isDir ? "4096" : " 512"
          return `${perms}  1 user user  ${size} Mar 23 12:00 ${item}`
        })
        return { output: lines.join("\n"), newCwd: state.cwd }
      }
      return { output: items.join("  "), newCwd: state.cwd }
    }

    case "cd": {
      if (!args[0] || args[0] === "~") return { output: "", newCwd: "/home/user" }
      const resolved = resolveDir(state.cwd, args[0])
      if (!resolved) return { output: `cd: ${args[0]}: No such file or directory`, newCwd: state.cwd }
      return { output: "", newCwd: resolved }
    }

    case "pwd":
      return { output: state.cwd, newCwd: state.cwd }

    case "cat": {
      if (!args[0]) return { output: "cat: missing file operand", newCwd: state.cwd }
      const filePath = args[0].startsWith("/") ? args[0] : (state.cwd === "/" ? "/" + args[0] : state.cwd + "/" + args[0])
      const content = FILE_CONTENTS[filePath]
      if (content) return { output: content, newCwd: state.cwd }
      // Check if it's a directory
      if (FILESYSTEM[filePath]) return { output: `cat: ${args[0]}: Is a directory`, newCwd: state.cwd }
      return { output: `cat: ${args[0]}: No such file or directory`, newCwd: state.cwd }
    }

    case "echo":
      return { output: args.join(" ").replace(/["']/g, ""), newCwd: state.cwd }

    case "whoami":
      return { output: "root", newCwd: state.cwd }

    case "hostname":
      return { output: "project-s-server", newCwd: state.cwd }

    case "uname":
      if (args.includes("-a"))
        return { output: "Linux project-s-server 6.1.0-rpi7-rpi-v8 #1 SMP PREEMPT aarch64 GNU/Linux", newCwd: state.cwd }
      return { output: "Linux", newCwd: state.cwd }

    case "uptime":
      return { output: " 14:32:01 up 12 days,  3:21,  1 user,  load average: 1.15, 0.89, 0.72", newCwd: state.cwd }

    case "date":
      return { output: new Date().toString(), newCwd: state.cwd }

    case "docker":
      switch (args[0]) {
        case "ps":
          return { output: DOCKER_PS, newCwd: state.cwd }
        case "images":
          return { output: DOCKER_IMAGES, newCwd: state.cwd }
        case "stats":
          return { output: DOCKER_STATS, newCwd: state.cwd }
        case "compose":
          if (args[1] === "up") return { output: "Starting services...\n✔ Container project-s-dashboard-1  Started\n✔ Container project-s-jellyfin-1   Started\n✔ Container project-s-authelia-1   Started", newCwd: state.cwd }
          if (args[1] === "down") return { output: "Stopping services...\n✔ Container project-s-dashboard-1  Stopped\n✔ Container project-s-jellyfin-1   Stopped\n✔ Container project-s-authelia-1   Stopped", newCwd: state.cwd }
          if (args[1] === "logs") return { output: "project-s-dashboard-1  | ▲ Next.js 16.2.0\nproject-s-dashboard-1  | - Local: http://localhost:3069\nproject-s-dashboard-1  | ✓ Ready in 180ms\nproject-s-jellyfin-1   | [INF] Jellyfin version 10.9.0\nproject-s-authelia-1   | level=info msg=Authelia is listening on :9091", newCwd: state.cwd }
          return { output: `Usage: docker compose [up|down|logs]`, newCwd: state.cwd }
        default:
          return { output: `Usage: docker [ps|images|stats|compose]`, newCwd: state.cwd }
      }

    case "neofetch":
      return {
        output: `        .-/+oossssoo+/-.          root@project-s-server
    \`:+ssssssssssssssssss+:\`      ─────────────────────
  -+ssssssssssssssssssyyssss+-    OS: Debian GNU/Linux 12 (bookworm) aarch64
.osssssssssssssssssssdMMMNysssso.  Host: Raspberry Pi 5 Model B Rev 1.0
+sssssssssssssssssssymMMMMhssssss+ Kernel: 6.1.0-rpi7-rpi-v8
/sssssssssssssssssshNMMMNyssssssss/ Uptime: 12 days, 3 hours
.ssssssssssssssssssMMMMMmssssssss. Packages: 1247 (dpkg)
+sssssssssssshhhyNMMNyssssssssssss Shell: bash 5.2.15
ossssssssssNMMMMyyssssssssssssssso Terminal: Project S Dashboard
ossssssssssNMMMNhssssssssssssssso  CPU: BCM2712 (4) @ 2.40GHz
+sssssssssydmmdyssssssssssssssss+  Memory: 1842MiB / 8192MiB
/sssssssssssssssssssssssssssssss/  Disk: 11G / 256G (5%)
.osssssssssssssssssssssssssssso.   Docker: 6 containers running
  -+sssssssssssssssssssssssss+-
    \`:+ssssssssssssssssss+:\`
        .-/+oossssoo+/-.`,
        newCwd: state.cwd,
      }

    case "ping": {
      if (!args[0]) return { output: "ping: usage: ping <host>", newCwd: state.cwd }
      const host = args[0]
      const ms = () => (Math.random() * 5 + 0.5).toFixed(1)
      return {
        output: `PING ${host} (192.168.1.10): 56 data bytes\n64 bytes from 192.168.1.10: icmp_seq=0 ttl=64 time=${ms()} ms\n64 bytes from 192.168.1.10: icmp_seq=1 ttl=64 time=${ms()} ms\n64 bytes from 192.168.1.10: icmp_seq=2 ttl=64 time=${ms()} ms\n--- ${host} ping statistics ---\n3 packets transmitted, 3 packets received, 0% packet loss`,
        newCwd: state.cwd,
      }
    }

    case "history":
      return { output: state.history.map((h, i) => `  ${i + 1}  ${h}`).join("\n"), newCwd: state.cwd }

    case "env":
      return { output: Object.entries(state.env).map(([k, v]) => `${k}=${v}`).join("\n"), newCwd: state.cwd }

    case "export": {
      const assignment = args.join(" ")
      const eqIndex = assignment.indexOf("=")
      if (eqIndex === -1) return { output: "export: usage: export KEY=VALUE", newCwd: state.cwd }
      const key = assignment.slice(0, eqIndex)
      const val = assignment.slice(eqIndex + 1).replace(/["']/g, "")
      state.env[key] = val
      return { output: "", newCwd: state.cwd }
    }

    case "clear":
      return { output: "__CLEAR__", newCwd: state.cwd }

    default:
      return { output: `${cmd}: command not found. Type 'help' for available commands.`, newCwd: state.cwd }
  }
}
