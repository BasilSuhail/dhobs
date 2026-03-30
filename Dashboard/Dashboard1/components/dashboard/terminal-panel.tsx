"use client"

import "@xterm/xterm/css/xterm.css"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { Terminal, ITheme } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { X, Maximize2, Minimize2, Plus, Terminal as TerminalIcon, BrainCircuit } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TerminalTab {
  id: string
  title: string
  shell?: 'ollama'
}

interface TerminalPanelProps {
  open: boolean
  onClose: () => void
}

// Per-tab terminal instance — mounts once, stays alive until tab is closed
interface TerminalInstanceProps {
  tabId: string
  active: boolean
  shell?: 'ollama'
  xtermTheme: ITheme
  onFitReady: (fit: () => void) => void
}

function TerminalInstance({ tabId, active, shell, xtermTheme, onFitReady }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Initialize terminal + WebSocket on mount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

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

    // Fit after paint so container has dimensions
    const fitTimer = setTimeout(() => {
      fitAddon.fit()
      terminal.focus()
    }, 50)

    const wsUrl = shell === 'ollama'
      ? `ws://${window.location.hostname}:3070?shell=ollama`
      : `ws://${window.location.hostname}:3070`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      const dims = fitAddon.proposeDimensions()
      if (dims) {
        ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
      }
    }

    ws.onmessage = (e: MessageEvent) => {
      terminal.write(e.data)
    }

    ws.onerror = () => {
      terminal.write('\r\n\x1b[31mWebSocket connection failed. Is the server running?\x1b[0m\r\n')
    }

    ws.onclose = () => {
      terminal.write('\r\n\x1b[33m[Session closed]\x1b[0m\r\n')
    }

    terminal.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })

    termRef.current = terminal
    fitRef.current = fitAddon
    wsRef.current = ws

    // Expose fit function to parent for resize handling
    onFitReady(() => {
      if (fitRef.current && wsRef.current) {
        fitRef.current.fit()
        const dims = fitRef.current.proposeDimensions()
        if (dims && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
        }
      }
    })

    return () => {
      clearTimeout(fitTimer)
      ws.close()
      terminal.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When tab becomes active, re-fit and focus
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => {
      if (fitRef.current && wsRef.current && termRef.current) {
        fitRef.current.fit()
        termRef.current.focus()
        const dims = fitRef.current.proposeDimensions()
        if (dims && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
        }
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [active])

  // Update xterm theme when dashboard theme changes
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

export function TerminalPanel({ open, onClose }: TerminalPanelProps) {
  const { colorTheme, mode } = useTheme()
  const [tabs, setTabs] = useState<TerminalTab[]>([{ id: "1", title: "bash" }])
  const [activeTab, setActiveTab] = useState("1")
  const [isMaximized, setIsMaximized] = useState(false)
  const [height, setHeight] = useState(320)

  const resizeRef = useRef<HTMLDivElement>(null)
  const tabCounter = useRef(1)
  // Stores fit+resize functions per tab so parent can trigger on panel resize
  const fitFns = useRef<Map<string, () => void>>(new Map())

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

  // Resize handle drag
  useEffect(() => {
    const resizeEl = resizeRef.current
    if (!resizeEl) return

    let startY = 0
    let startHeight = 0

    const onMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY
      const newH = Math.min(Math.max(startHeight + delta, 200), window.innerHeight - 100)
      setHeight(newH)
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      fitFns.current.get(activeTab)?.()
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
  }, [height, activeTab])

  // Re-fit on maximize toggle
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

  const closeTab = useCallback((tabId: string, currentTabs: TerminalTab[]) => {
    fitFns.current.delete(tabId)
    if (currentTabs.length === 1) {
      onClose()
      return
    }
    const remaining = currentTabs.filter(t => t.id !== tabId)
    setTabs(remaining)
    setActiveTab(prev => prev === tabId ? remaining[0].id : prev)
  }, [onClose])

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
    >
      {/* Resize Handle */}
      {!isMaximized && (
        <div
          ref={resizeRef}
          className="h-1.5 cursor-ns-resize flex items-center justify-center"
          style={{ background: "transparent" }}
        >
          <div
            className="w-12 h-0.5 rounded-full"
            style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
          />
        </div>
      )}

      {/* Main Panel */}
      <div
        className="flex-1 flex flex-col overflow-hidden border-t rounded-t-xl shadow-2xl"
        style={{
          backgroundColor: mode === 'dark' ? 'rgba(10, 10, 10, 0.97)' : 'rgba(245, 245, 245, 0.97)',
          backdropFilter: "blur(24px) saturate(120%)",
          WebkitBackdropFilter: "blur(24px) saturate(120%)",
          borderColor: colorTheme.border,
        }}
      >
        {/* Tab Bar */}
        <div className="flex items-center h-9 px-2 border-b shrink-0" style={{ borderColor: colorTheme.border }}>
          <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
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
                  : <TerminalIcon className="h-3 w-3" strokeWidth={1.5} />
                }
                <span className="font-medium">{tab.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id, tabs) }}
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
              xtermTheme={xtermTheme}
              onFitReady={handleFitReady(tab.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
