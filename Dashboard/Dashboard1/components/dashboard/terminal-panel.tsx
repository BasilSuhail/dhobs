"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { X, Minus, Maximize2, Minimize2, Plus, Terminal as TerminalIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TerminalTab {
  id: string
  title: string
}

interface TerminalPanelProps {
  open: boolean
  onClose: () => void
}

// Simulated filesystem and command state
interface ShellState {
  cwd: string
  env: Record<string, string>
  history: string[]
}

const FILESYSTEM: Record<string, string[]> = {
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

const FILE_CONTENTS: Record<string, string> = {
  "/home/user/.bashrc": 'export PATH="$HOME/.local/bin:$PATH"\nexport EDITOR=nvim\nalias ll="ls -la"\nalias dc="docker compose"',
  "/home/user/documents/notes.txt": "Project S Development Notes\n===========================\n- Phase 1: Dashboard prototype\n- Phase 2: Docker orchestration\n- Phase 3: App store module",
  "/home/user/documents/readme.md": "# Home Lab Setup\n\nRunning Project S on Raspberry Pi 5.\nAll services behind Authelia SSO.",
  "/home/user/projects/project-s/docker-compose.yml": "version: '3.8'\nservices:\n  dashboard:\n    image: project-s/dashboard:latest\n    ports:\n      - '5111:3069'\n    restart: unless-stopped\n  jellyfin:\n    image: jellyfin/jellyfin:latest\n    ports:\n      - '8096:8096'\n    volumes:\n      - media:/media\n  authelia:\n    image: authelia/authelia:latest\n    ports:\n      - '9091:9091'",
  "/home/user/projects/project-s/README.md": "# Project S\n\nA unified, self-hosted operating system for the home server.",
  "/etc/hosts": "127.0.0.1    localhost\n192.168.1.10 dashboard.local\n192.168.1.10 jellyfin.local\n192.168.1.10 auth.local",
  "/etc/resolv.conf": "nameserver 192.168.1.1\nnameserver 1.1.1.1",
}

const DOCKER_PS = `CONTAINER ID   IMAGE                        STATUS          PORTS                    NAMES
a1b2c3d4e5f6   project-s/dashboard:latest   Up 2 hours      0.0.0.0:5111->3069/tcp   project-s-dashboard-1
f6e5d4c3b2a1   jellyfin/jellyfin:latest      Up 2 hours      0.0.0.0:8096->8096/tcp   project-s-jellyfin-1
1a2b3c4d5e6f   authelia/authelia:latest       Up 2 hours      0.0.0.0:9091->9091/tcp   project-s-authelia-1
6f5e4d3c2b1a   pihole/pihole:latest          Up 5 days       0.0.0.0:53->53/tcp       pihole
b1c2d3e4f5a6   portainer/portainer-ce        Up 5 days       0.0.0.0:9443->9443/tcp   portainer
d4e5f6a1b2c3   homeassistant/home-assistant  Up 12 hours     0.0.0.0:8123->8123/tcp   homeassistant`

const DOCKER_IMAGES = `REPOSITORY                       TAG       SIZE
project-s/dashboard              latest    245MB
jellyfin/jellyfin                latest    512MB
authelia/authelia                latest    89MB
pihole/pihole                    latest    298MB
portainer/portainer-ce           latest    156MB
homeassistant/home-assistant     latest    1.2GB
nginx                            alpine    42MB
postgres                         16        412MB`

const DOCKER_STATS = `CONTAINER ID   NAME                        CPU %   MEM USAGE / LIMIT     NET I/O           BLOCK I/O
a1b2c3d4e5f6   project-s-dashboard-1       0.3%    128MiB / 8GiB         12kB / 8kB        0B / 0B
f6e5d4c3b2a1   project-s-jellyfin-1        1.2%    384MiB / 8GiB         1.2MB / 45MB      12MB / 0B
1a2b3c4d5e6f   project-s-authelia-1        0.1%    32MiB / 8GiB          4kB / 2kB         0B / 0B
6f5e4d3c2b1a   pihole                      0.2%    64MiB / 8GiB          128kB / 96kB      4MB / 0B
b1c2d3e4f5a6   portainer                   0.4%    96MiB / 8GiB          8kB / 4kB         8MB / 0B
d4e5f6a1b2c3   homeassistant               2.1%    512MiB / 8GiB         256kB / 128kB     24MB / 0B`

function resolveDir(cwd: string, target: string): string | null {
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

function processCommand(input: string, state: ShellState): { output: string; newCwd: string } {
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

export function TerminalPanel({ open, onClose }: TerminalPanelProps) {
  const { colorTheme, mode } = useTheme()
  const [tabs, setTabs] = useState<TerminalTab[]>([{ id: "1", title: "bash" }])
  const [activeTab, setActiveTab] = useState("1")
  const [isMaximized, setIsMaximized] = useState(false)
  const [height, setHeight] = useState(320)
  const [lines, setLines] = useState<Record<string, string[]>>({
    "1": [
      "\x1b[1;32mroot@project-s-server\x1b[0m:\x1b[1;34m~\x1b[0m$ Welcome to Project S Terminal",
      "Type 'help' for available commands.\n",
    ],
  })
  const [inputValue, setInputValue] = useState("")
  const [shellStates, setShellStates] = useState<Record<string, ShellState>>({
    "1": {
      cwd: "/home/user",
      env: {
        HOME: "/home/user",
        USER: "root",
        SHELL: "/bin/bash",
        PATH: "/usr/local/bin:/usr/bin:/bin",
        TERM: "xterm-256color",
        HOSTNAME: "project-s-server",
        EDITOR: "nvim",
        LANG: "en_US.UTF-8",
      },
      history: [],
    },
  })
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const tabCounter = useRef(1)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines, activeTab])

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, activeTab])

  // Resize handler
  useEffect(() => {
    const resizeEl = resizeRef.current
    if (!resizeEl) return

    let startY = 0
    let startHeight = 0

    const onMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY
      const newHeight = Math.min(Math.max(startHeight + delta, 200), window.innerHeight - 100)
      setHeight(newHeight)
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    const onMouseDown = (e: MouseEvent) => {
      startY = e.clientY
      startHeight = height
      document.body.style.cursor = "ns-resize"
      document.body.style.userSelect = "none"
      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    }

    resizeEl.addEventListener("mousedown", onMouseDown)
    return () => resizeEl.removeEventListener("mousedown", onMouseDown)
  }, [height])

  const getPrompt = useCallback((tabId: string) => {
    const state = shellStates[tabId]
    if (!state) return "$ "
    const dir = state.cwd === "/home/user" ? "~" : state.cwd.replace("/home/user", "~")
    return `\x1b[1;32mroot@project-s-server\x1b[0m:\x1b[1;34m${dir}\x1b[0m$ `
  }, [shellStates])

  const handleCommand = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const state = shellStates[activeTab]
      if (!state || state.history.length === 0) return
      const newIndex = historyIndex === -1 ? state.history.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(newIndex)
      setInputValue(state.history[newIndex])
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const state = shellStates[activeTab]
      if (!state || historyIndex === -1) return
      const newIndex = historyIndex + 1
      if (newIndex >= state.history.length) {
        setHistoryIndex(-1)
        setInputValue("")
      } else {
        setHistoryIndex(newIndex)
        setInputValue(state.history[newIndex])
      }
      return
    }
    if (e.key !== "Enter") return

    const cmd = inputValue.trim()
    setInputValue("")
    setHistoryIndex(-1)

    const state = shellStates[activeTab] || { cwd: "/home/user", env: {}, history: [] }
    const prompt = getPrompt(activeTab)

    if (cmd === "clear") {
      setLines(prev => ({ ...prev, [activeTab]: [] }))
      return
    }

    if (cmd === "exit") {
      if (tabs.length === 1) {
        onClose()
        return
      }
      const remaining = tabs.filter(t => t.id !== activeTab)
      setTabs(remaining)
      setActiveTab(remaining[0].id)
      const newLines = { ...lines }
      delete newLines[activeTab]
      setLines(newLines)
      const newStates = { ...shellStates }
      delete newStates[activeTab]
      setShellStates(newStates)
      return
    }

    const { output, newCwd } = processCommand(cmd, state)

    setShellStates(prev => ({
      ...prev,
      [activeTab]: { ...state, cwd: newCwd },
    }))

    setLines(prev => {
      const current = prev[activeTab] || []
      const newLines = [...current, `${prompt}${cmd}`]
      if (output) newLines.push(output)
      return { ...prev, [activeTab]: newLines }
    })
  }, [inputValue, activeTab, shellStates, lines, tabs, getPrompt, historyIndex, onClose])

  const addTab = () => {
    tabCounter.current += 1
    const id = String(tabCounter.current)
    setTabs(prev => [...prev, { id, title: "bash" }])
    setLines(prev => ({
      ...prev,
      [id]: [
        "\x1b[1;32mroot@project-s-server\x1b[0m:\x1b[1;34m~\x1b[0m$ Welcome to Project S Terminal",
        "Type 'help' for available commands.\n",
      ],
    }))
    setShellStates(prev => ({
      ...prev,
      [id]: {
        cwd: "/home/user",
        env: {
          HOME: "/home/user",
          USER: "root",
          SHELL: "/bin/bash",
          PATH: "/usr/local/bin:/usr/bin:/bin",
          TERM: "xterm-256color",
          HOSTNAME: "project-s-server",
          EDITOR: "nvim",
          LANG: "en_US.UTF-8",
        },
        history: [],
      },
    }))
    setActiveTab(id)
  }

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) {
      onClose()
      return
    }
    const remaining = tabs.filter(t => t.id !== tabId)
    setTabs(remaining)
    if (activeTab === tabId) setActiveTab(remaining[0].id)
    const newLines = { ...lines }
    delete newLines[tabId]
    setLines(newLines)
  }

  // Parse ANSI-like color codes for display
  const renderLine = (line: string, index: number) => {
    const parts: React.ReactNode[] = []
    let remaining = line
    let key = 0

    const colorMap: Record<string, string> = {
      "1;32": "#22c55e",  // bold green
      "1;34": "#58a6ff",  // bold blue
      "0": "",            // reset
    }

    while (remaining.length > 0) {
      const escIndex = remaining.indexOf("\x1b[")
      if (escIndex === -1) {
        parts.push(<span key={key++}>{remaining}</span>)
        break
      }
      if (escIndex > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, escIndex)}</span>)
      }
      const mIndex = remaining.indexOf("m", escIndex)
      if (mIndex === -1) {
        parts.push(<span key={key++}>{remaining.slice(escIndex)}</span>)
        break
      }
      const code = remaining.slice(escIndex + 2, mIndex)
      const color = colorMap[code]
      remaining = remaining.slice(mIndex + 1)

      // Find next escape or end
      const nextEsc = remaining.indexOf("\x1b[")
      const text = nextEsc === -1 ? remaining : remaining.slice(0, nextEsc)
      if (text && color) {
        parts.push(<span key={key++} style={{ color, fontWeight: code.startsWith("1") ? 600 : 400 }}>{text}</span>)
      } else if (text) {
        parts.push(<span key={key++}>{text}</span>)
      }
      remaining = nextEsc === -1 ? "" : remaining.slice(nextEsc)
    }

    return <div key={index} className="whitespace-pre-wrap break-all">{parts}</div>
  }

  if (!open) return null

  const panelHeight = isMaximized ? "100vh" : `${height}px`

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[60] flex flex-col",
        "transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "translate-y-full"
      )}
      style={{
        height: panelHeight,
        marginLeft: isMaximized ? 0 : "72px",
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Resize Handle */}
      {!isMaximized && (
        <div
          ref={resizeRef}
          className="h-1.5 cursor-ns-resize flex items-center justify-center group"
          style={{ background: "transparent" }}
        >
          <div 
            className="w-12 h-0.5 rounded-full transition-colors" 
            style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
          />
        </div>
      )}

      {/* Main Panel */}
      <div
        className="flex-1 flex flex-col overflow-hidden border-t rounded-t-xl transition-colors duration-500 shadow-2xl"
        style={{
          backgroundColor: mode === 'dark' ? 'rgba(10, 10, 10, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: "blur(24px) saturate(120%)",
          WebkitBackdropFilter: "blur(24px) saturate(120%)",
          borderColor: colorTheme.border,
        }}
      >
        {/* Tab Bar */}
        <div className="flex items-center h-9 px-2 border-b shrink-0" style={{ borderColor: colorTheme.border }}>
          {/* Tabs */}
          <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-7 rounded-md text-xs cursor-pointer transition-all group"
                )}
                style={activeTab === tab.id ? {
                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: colorTheme.foreground
                } : {
                  color: colorTheme.muted
                }}
              >
                <TerminalIcon className="h-3 w-3" strokeWidth={1.5} />
                <span className="font-medium">{tab.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-all"
                  style={{ color: `${colorTheme.muted}80` }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={addTab}
                    className="flex items-center justify-center h-6 w-6 rounded transition-all"
                    style={{ color: colorTheme.muted }}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  <p>New tab</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="flex items-center justify-center h-6 w-6 rounded transition-all"
              style={{ color: colorTheme.muted }}
            >
              {isMaximized
                ? <Minimize2 className="h-3 w-3" />
                : <Maximize2 className="h-3 w-3" />
              }
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center h-6 w-6 rounded hover:bg-red-400/10 transition-all"
              style={{ color: colorTheme.muted }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed"
          style={{ color: mode === 'dark' ? '#e6edf3' : '#1a1a1a' }}
        >
          {(lines[activeTab] || []).map((line, i) => renderLine(line, i))}

          {/* Input Line */}
          <div className="flex items-center whitespace-pre-wrap">
            {renderLine(getPrompt(activeTab), -1)}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleCommand}
              className="flex-1 bg-transparent outline-none border-none font-mono text-[13px]"
              style={{ 
                color: mode === 'dark' ? '#e6edf3' : '#1a1a1a',
                caretColor: colorTheme.accent
              }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
