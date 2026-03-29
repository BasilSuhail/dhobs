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
import { processCommand, type ShellState } from "@/lib/terminal-engine"

interface TerminalTab {
  id: string
  title: string
}

interface TerminalPanelProps {
  open: boolean
  onClose: () => void
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

          {/* Demo indicator */}
          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border opacity-40" style={{ borderColor: colorTheme.border, color: colorTheme.muted }}>
            Demo
          </span>

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
