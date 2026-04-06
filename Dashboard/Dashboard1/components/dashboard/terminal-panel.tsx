"use client"

import "@xterm/xterm/css/xterm.css"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { Terminal, ITheme } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { X, Maximize2, Minimize2, Plus, Terminal as TerminalIcon, BrainCircuit, Container } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TerminalTab {
  id: string
  title: string
  shell?: 'ollama' | 'container'
  containerName?: string
}

interface TerminalPanelProps {
  open: boolean
  onClose: () => void
  execTarget?: string         // full container name to exec into (e.g. 'project-s-jellyfin')
  onExecConsumed?: () => void // called after execTarget has been consumed
}

interface TerminalInstanceProps {
  tabId: string
  active: boolean
  shell?: 'ollama' | 'container'
  containerName?: string
  xtermTheme: ITheme
  onFitReady: (fit: () => void) => void
  onTitleChange?: (title: string) => void
}

function TerminalInstance({ tabId, active, shell, containerName, xtermTheme, onFitReady, onTitleChange }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ── Terminal setup (synchronous) ──────────────────────────────────────────
    const terminal = new Terminal({
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: xtermTheme,
      cursorBlink: true,
      scrollback: 2000,
      allowTransparency: true,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())
    terminal.open(container)

    const fitTimer = setTimeout(() => {
      fitAddon.fit()
      terminal.focus()
    }, 50)

    // Fix #6: dynamic tab title via OSC escape sequences from the pty
    terminal.onTitleChange((title: string) => {
      if (title) onTitleChange?.(title)
    })

    termRef.current = terminal
    fitRef.current  = fitAddon

    onFitReady(() => {
      if (fitRef.current) {
        fitRef.current.fit()
        const dims = fitRef.current.proposeDimensions()
        if (dims && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
        }
      }
    })

    // ── Landing mode: mock terminal (no WebSocket) ────────────────────────────
    if (process.env.NEXT_PUBLIC_LANDING_MODE === 'true') {
      const prompt = '\r\x1b[32mhomeforge\x1b[0m \x1b[34m~\x1b[0m \x1b[90m$\x1b[0m '
      terminal.write('\x1b[2J\x1b[H')
      terminal.write('\r\x1b[90m┌──────────────────────────────────────────┐\x1b[0m\r\n')
      terminal.write('\r\x1b[90m│\x1b[0m  \x1b[32mHomeForge Terminal\x1b[0m  \x1b[90m—  Preview Mode  │\x1b[0m\r\n')
      terminal.write('\r\x1b[90m└──────────────────────────────────────────┘\x1b[0m\r\n')
      terminal.write('\r\x1b[90mCommands are not executed in preview mode.\x1b[0m\r\n\r\n')
      terminal.write(prompt)
      let line = ''
      terminal.onData((data: string) => {
        const code = data.charCodeAt(0)
        if (code === 13) {
          terminal.write('\r\n\x1b[90m— preview mode, command not executed —\x1b[0m\r\n\r\n')
          line = ''
          terminal.write(prompt)
        } else if (code === 127) {
          if (line.length > 0) { line = line.slice(0, -1); terminal.write('\b \b') }
        } else if (code >= 32) {
          line += data; terminal.write(data)
        }
      })
      return () => { clearTimeout(fitTimer); terminal.dispose() }
    }

    // onData uses wsRef (not captured ws) so it works before and after WS connects
    terminal.onData((data: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }))
      }
    })

    // ── Async WS connection (needs auth ticket) ───────────────────────────────
    let cancelled = false

    async function connect() {
      // Fix #1: detect ws vs wss based on page protocol
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      let wsUrl: string
      if (shell === 'container' && containerName) {
        wsUrl = `${proto}://${window.location.hostname}:3070?shell=container&container=${encodeURIComponent(containerName)}`
      } else if (shell === 'ollama') {
        wsUrl = `${proto}://${window.location.hostname}:3070?shell=ollama`
      } else {
        wsUrl = `${proto}://${window.location.hostname}:3070`
      }

      // Obtain a short-lived HMAC ticket before opening the socket
      try {
        const res = await fetch('/api/auth/ws-ticket')
        if (!res.ok) {
          if (!cancelled) terminal.write('\r\n\x1b[31mSession expired — please sign in again.\x1b[0m\r\n')
          return
        }
        const { ticket } = await res.json()
        // Use ? if wsUrl has no query string yet, & if it already has params
        wsUrl += (wsUrl.includes('?') ? '&' : '?') + `ticket=${encodeURIComponent(ticket)}`
      } catch {
        if (!cancelled) terminal.write('\r\n\x1b[31mFailed to obtain terminal ticket — is the server running?\x1b[0m\r\n')
        return
      }

      if (cancelled) return

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        const dims = fitAddon.proposeDimensions()
        if (dims) ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
      }

      ws.onmessage = (e: MessageEvent) => {
        terminal.write(e.data)
      }

      ws.onerror = () => {
        terminal.write('\r\n\x1b[31mWebSocket connection failed. Is the server running?\x1b[0m\r\n')
      }

      ws.onclose = (event) => {
        if (event.code === 4401) {
          terminal.write('\r\n\x1b[31m[Unauthorized — ticket rejected]\x1b[0m\r\n')
        } else if (event.code === 4408) {
          terminal.write('\r\n\x1b[33m[Session closed — idle timeout]\x1b[0m\r\n')
        } else {
          terminal.write('\r\n\x1b[33m[Session closed]\x1b[0m\r\n')
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(fitTimer)
      wsRef.current?.close()
      wsRef.current = null
      terminal.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => {
      if (fitRef.current && termRef.current) {
        fitRef.current.fit()
        termRef.current.focus()
        const dims = fitRef.current.proposeDimensions()
        if (dims && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
        }
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [active])

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = xtermTheme
    }
  }, [xtermTheme])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        display: active ? 'block' : 'none',
        padding: '6px 8px',
      }}
    />
  )
}

export function TerminalPanel({ open, onClose, execTarget, onExecConsumed }: TerminalPanelProps) {
  const { colorTheme, mode } = useTheme()
  const [tabs, setTabs] = useState<TerminalTab[]>([{ id: "1", title: "bash" }])
  const [activeTab, setActiveTab] = useState("1")
  const [isMaximized, setIsMaximized] = useState(false)
  const [height, setHeight] = useState(320)

  const resizeRef = useRef<HTMLDivElement>(null)
  const panelRef  = useRef<HTMLDivElement>(null)  // for direct DOM height during drag
  const isDragging = useRef(false)
  const heightRef = useRef(height)         // always-current height for drag handler
  useEffect(() => { heightRef.current = height }, [height])
  const tabCounter = useRef(1)
  const fitFns = useRef<Map<string, () => void>>(new Map())
  // Fix #4: track whether the panel has ever been opened
  const hasEverOpened = useRef(false)

  const xtermTheme = useMemo<ITheme>(() => ({
    background:    mode === 'dark' ? '#0a0a0a' : '#f5f5f5',
    foreground:    mode === 'dark' ? '#e6edf3' : '#1a1a1a',
    cursor:        colorTheme.accent,
    cursorAccent:  mode === 'dark' ? '#0a0a0a' : '#ffffff',
    selectionBackground: `${colorTheme.accent}55`,
    black:         '#0d1117',
    red:           '#ff7b72',
    green:         '#3fb950',
    yellow:        '#d29922',
    blue:          '#58a6ff',
    magenta:       '#bc8cff',
    cyan:          '#39c5cf',
    white:         '#b1bac4',
    brightBlack:   '#6e7681',
    brightRed:     '#ffa198',
    brightGreen:   '#56d364',
    brightYellow:  '#e3b341',
    brightBlue:    '#79c0ff',
    brightMagenta: '#d2a8ff',
    brightCyan:    '#56d4dd',
    brightWhite:   '#f0f6fc',
  }), [colorTheme.accent, mode])

  const handleFitReady = useCallback((tabId: string) => (fn: () => void) => {
    fitFns.current.set(tabId, fn)
  }, [])

  // Fix #6: dynamic tab title updates from OSC sequences
  const handleTitleChange = useCallback((tabId: string) => (title: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, title } : t))
  }, [])

  // Fix #4: re-fit when panel slides back into view
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => fitFns.current.get(activeTab)?.(), 100)
    return () => clearTimeout(timer)
  }, [open, activeTab])

  // Fix #5: open a new exec tab when a container tile triggers it
  useEffect(() => {
    if (!execTarget) return
    tabCounter.current += 1
    const id = String(tabCounter.current)
    const shortName = execTarget.replace('project-s-', '')
    setTabs(prev => [...prev, { id, title: shortName, shell: 'container', containerName: execTarget }])
    setActiveTab(id)
    onExecConsumed?.()
  }, [execTarget, onExecConsumed])

  // Resize handle drag
  useEffect(() => {
    const resizeEl = resizeRef.current
    if (!resizeEl) return

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      const startY = e.clientY
      const startHeight = heightRef.current
      isDragging.current = true

      // Strip transition during drag so it's instant
      if (panelRef.current) panelRef.current.style.transition = 'none'

      document.body.style.cursor = "ns-resize"
      document.body.style.userSelect = "none"

      const onMouseMove = (e: MouseEvent) => {
        if (!panelRef.current) return
        const delta = startY - e.clientY
        const newH = Math.min(Math.max(startHeight + delta, 160), window.innerHeight - 80)
        // Direct DOM update — zero React re-renders during drag
        panelRef.current.style.height = `${newH}px`
        heightRef.current = newH
      }

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mouseup", onMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        isDragging.current = false
        // Restore transition and commit final height to React state
        if (panelRef.current) panelRef.current.style.transition = ''
        setHeight(heightRef.current)
        setTimeout(() => fitFns.current.get(activeTab)?.(), 80)
      }

      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    }

    resizeEl.addEventListener("mousedown", onMouseDown)
    return () => resizeEl.removeEventListener("mousedown", onMouseDown)
  }, [activeTab, open])

  useEffect(() => {
    const timer = setTimeout(() => fitFns.current.get(activeTab)?.(), 100)
    return () => clearTimeout(timer)
  }, [isMaximized, activeTab])

  const addTab = useCallback(() => {
    tabCounter.current += 1
    const id = String(tabCounter.current)
    setTabs(prev => [...prev, { id, title: "bash" }])
    setActiveTab(id)
  }, [])

  const addOllamaTab = useCallback(() => {
    tabCounter.current += 1
    const id = String(tabCounter.current)
    setTabs(prev => [...prev, { id, title: "ollama", shell: 'ollama' as const }])
    setActiveTab(id)
  }, [])

  // Fix #3: stale closure fix — use functional state updater, no more passing tabs as param
  const closeTab = useCallback((tabId: string) => {
    fitFns.current.delete(tabId)
    setTabs(prev => {
      if (prev.length === 1) {
        onClose()
        return prev
      }
      const remaining = prev.filter(t => t.id !== tabId)
      setActiveTab(a => a === tabId ? remaining[0].id : a)
      return remaining
    })
  }, [onClose])

  // Fix #4: guard AFTER all hooks — Rules of Hooks satisfied
  if (open) hasEverOpened.current = true
  if (!hasEverOpened.current) return null

  const panelHeight = isMaximized ? "100vh" : `${height}px`

  return (
    // Fix #4: use CSS transform to hide instead of unmounting — sessions stay alive
    <div
      ref={panelRef}
      className="fixed z-[60] flex flex-col transition-all duration-300 ease-out"
      style={{
        height: panelHeight,
        ...(isMaximized
          ? { top: 0, left: 0, right: 0, bottom: 0 }
          : { bottom: '20px', left: '92px', right: '20px' }
        ),
        transform: open ? 'translateY(0)' : 'translateY(calc(100% + 20px))',
      }}
    >


      {/* Resize Strip */}
      {!isMaximized && (
        <div
          ref={resizeRef}
          className="flex items-center justify-center cursor-ns-resize shrink-0 group"
          style={{ height: '20px', background: 'transparent' }}
        >
          <div
            className="h-1 rounded-full transition-all duration-200 group-hover:opacity-80"
            style={{
              width: '64px',
              backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
            }}
          />
        </div>
      )}

      {/* Main Panel */}
      <div
        className="flex-1 flex flex-col overflow-hidden border rounded-2xl shadow-2xl"
        style={{
          backgroundColor: mode === 'dark' ? 'rgba(10, 10, 10, 0.97)' : 'rgba(245, 245, 245, 0.97)',
          backdropFilter: "blur(24px) saturate(120%)",
          WebkitBackdropFilter: "blur(24px) saturate(120%)",
          borderColor: colorTheme.border,
        }}
      >
        {/* Tab Bar */}
        <div
          className="flex items-center h-9 px-2 border-b shrink-0"
          style={{ borderColor: colorTheme.border }}
        >
          <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                data-tab
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs cursor-pointer transition-all group"
                style={activeTab === tab.id ? {
                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: colorTheme.foreground
                } : {
                  color: colorTheme.muted
                }}
              >
                {tab.shell === 'ollama'
                  ? <BrainCircuit className="h-3 w-3" strokeWidth={1.5} />
                  : tab.shell === 'container'
                  ? <Container className="h-3 w-3" strokeWidth={1.5} />
                  : <TerminalIcon className="h-3 w-3" strokeWidth={1.5} />
                }
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
                  <p>New bash tab</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={addOllamaTab}
                    className="flex items-center justify-center h-6 w-6 rounded transition-all"
                    style={{ color: colorTheme.muted }}
                  >
                    <BrainCircuit className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  <p>New Ollama shell</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setIsMaximized(v => !v)}
              className="flex items-center justify-center h-6 w-6 rounded transition-all"
              style={{ color: colorTheme.muted }}
            >
              {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
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

        {/* Terminal instances — all mounted, only active one shown */}
        <div className="flex-1 overflow-hidden relative">
          {tabs.map((tab) => (
            <TerminalInstance
              key={tab.id}
              tabId={tab.id}
              active={activeTab === tab.id}
              shell={tab.shell}
              containerName={tab.containerName}
              xtermTheme={xtermTheme}
              onFitReady={handleFitReady(tab.id)}
              onTitleChange={handleTitleChange(tab.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
