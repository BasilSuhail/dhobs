"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { WelcomeSection } from "@/components/dashboard/welcome-section"
import { DashboardSection } from "@/components/dashboard/dashboard-section"
import { MetricsSection } from "@/components/dashboard/metrics-section"
import { OllamaSection } from "@/components/dashboard/ollama-section"
import { KiwixSection } from "@/components/dashboard/kiwix-section"
import { TerminalPanel } from "@/components/dashboard/terminal-panel"
import { type DockApp } from "@/components/dashboard/dock"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Construction, BrainCircuit, Book, X, Minus, Maximize2 } from "lucide-react"

interface ActiveWindow {
  id: string
  name: string
  icon: any
  component: React.ReactNode
  isMinimized: boolean
  isClosing?: boolean
  zIndex: number
  position: { x: number; y: number }
  size: { w: number; h: number }
}

export default function HomePage() {
  const IS_LANDING = process.env.NEXT_PUBLIC_LANDING_MODE === 'true'
  const { colorTheme } = useTheme()
  const [scrollProgress, setScrollProgress] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [execTarget, setExecTarget] = useState<string | undefined>()
  const [currentSection, setCurrentSection] = useState("home")
  const [openWindows, setOpenWindows] = useState<ActiveWindow[]>([])
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; startLeft: number; startTop: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || currentSection !== "home") return
      const scrollTop = window.scrollY
      const windowHeight = window.innerHeight
      const progress = Math.min(scrollTop / windowHeight, 1)
      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [currentSection])

  // Drag handlers
  useEffect(() => {
    if (!dragState) return
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY
      setOpenWindows(prev => prev.map(w =>
        w.id === dragState.id
          ? { ...w, position: { x: dragState.startLeft + dx, y: dragState.startTop + dy } }
          : w
      ))
    }
    const handleMouseUp = () => setDragState(null)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragState])

  const bringToFront = useCallback((id: string) => {
    setOpenWindows(prev => {
      const maxZ = Math.max(0, ...prev.map(w => w.zIndex))
      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w)
    })
  }, [])

  const openApp = useCallback((id: string, name: string, icon: any, component: React.ReactNode) => {
    setOpenWindows(prev => {
      const existing = prev.find(w => w.id === id)
      if (existing) {
        if (existing.isClosing) return prev
        // Restore if minimized
        const maxZ = Math.max(0, ...prev.map(w => w.zIndex))
        return prev.map(w => w.id === id ? { ...w, isMinimized: false, zIndex: maxZ + 1 } : w)
      }
      const maxZ = Math.max(0, ...prev.map(w => w.zIndex))
      // Stagger window positions
      const offset = (prev.length % 4) * 30
      return [...prev, { id, name, icon, component, isMinimized: false, zIndex: maxZ + 1, position: { x: 120 + offset, y: 40 + offset }, size: { w: Math.min(900, window.innerWidth - 200), h: Math.min(700, window.innerHeight - 120) } }]
    })
  }, [])

  const closeApp = useCallback((id: string) => {
    setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, isClosing: true, isMinimized: false } : w))
    setTimeout(() => {
      setOpenWindows(prev => prev.filter(w => !(w.id === id && w.isClosing)))
    }, 400)
  }, [])

  const minimizeApp = useCallback((id: string) => {
    setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w))
  }, [])

  // Sidebar icon click: if active → minimize; if minimized → restore; if closing → reopen
  const handleDockClick = useCallback((id: string) => {
    const win = openWindows.find(w => w.id === id)
    if (!win) return
    if (win.isClosing) {
      if (id === "ollama") openApp("ollama", "Ollama", BrainCircuit, <OllamaSection isWindow />)
      if (id === "kiwix") openApp("kiwix", "Kiwix", Book, <KiwixSection isWindow />)
    } else if (win.isMinimized) {
      bringToFront(id)
      setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: false } : w))
    } else {
      minimizeApp(id)
    }
  }, [openWindows, openApp, closeApp])

  const bgColor = mounted ? colorTheme.background : "#0a0a0a"
  const accentColor = mounted ? colorTheme.accent : "#d4e157"

  const handleNavigate = (section: string) => {
    if (section === "ollama") {
      openApp("ollama", "Ollama", BrainCircuit, <OllamaSection isWindow />)
      return
    }
    if (section === "kiwix") {
      openApp("kiwix", "Kiwix", Book, <KiwixSection isWindow />)
      return
    }
    // Close all open apps when navigating away
    setOpenWindows([])
    setCurrentSection(section)
    if (section === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // Show all open windows in the sidebar — active, minimized, or closing
  const dockApps: DockApp[] = openWindows.map(w => ({
    id: w.id,
    name: w.name,
    icon: w.icon,
    isOpen: !w.isClosing,
    isActive: !w.isMinimized && !w.isClosing,
    isClosing: w.isClosing
  }))

  return (
    <div 
      ref={containerRef}
      className={currentSection === "home" ? "relative min-h-[200vh]" : "relative h-screen overflow-hidden"}
      style={{ backgroundColor: bgColor }}
    >
      {/* Aurora Glow Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div
          className="absolute rounded-full blur-[120px] opacity-30"
          style={{
            width: "60%",
            height: "60%",
            background: `radial-gradient(ellipse, ${accentColor}40, transparent 70%)`,
            left: "-15%",
            top: "-15%",
            animation: "aurora 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full blur-[120px] opacity-20"
          style={{
            width: "50%",
            height: "50%",
            background: "radial-gradient(ellipse, rgba(34, 211, 238, 0.3), transparent 70%)",
            right: "-10%",
            bottom: "10%",
            animation: "aurora 25s ease-in-out infinite",
            animationDelay: "-12s",
          }}
        />
        <div
          className="absolute rounded-full blur-[100px] opacity-15"
          style={{
            width: "40%",
            height: "40%",
            background: `radial-gradient(ellipse, ${accentColor}30, transparent 70%)`,
            left: "40%",
            bottom: "-10%",
            animation: "aurora 25s ease-in-out infinite",
            animationDelay: "-6s",
          }}
        />
      </div>

      {/* Sidebar */}
      <Sidebar
        activeSection={openWindows.some(w => !w.isClosing) ? "app" : currentSection}
        onNavigate={handleNavigate}
        terminalOpen={terminalOpen}
        onToggleTerminal={() => setTerminalOpen(prev => !prev)}
        dockApps={dockApps}
        onDockAppClick={handleDockClick}
      />

      {/* Floating App Panels */}
      {openWindows.map((win) => (
        !win.isMinimized && (
          <div
            key={win.id}
            onClick={() => bringToFront(win.id)}
            className="fixed transition-all"
            style={{
              top: win.position.y,
              left: win.position.x,
              width: win.size.w,
              height: win.size.h,
              zIndex: win.zIndex,
              opacity: win.isClosing ? 0 : 1,
              transform: win.isClosing ? 'scale(0.95)' : 'scale(1)',
              pointerEvents: win.isClosing ? 'none' : 'auto',
              transition: win.isClosing ? 'opacity 0.4s, transform 0.4s' : 'box-shadow 0.2s',
              borderRadius: '14px',
              overflow: 'hidden',
              border: `1px solid ${colorTheme.border}`,
              backgroundColor: colorTheme.card,
              boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)`,
            }}
          >
            {/* Title Bar */}
            <div
              className="flex items-center justify-between px-4 py-2.5 select-none"
              style={{ borderBottom: `1px solid ${colorTheme.border}`, cursor: 'grab' }}
              onMouseDown={(e) => {
                setDragState({ id: win.id, startX: e.clientX, startY: e.clientY, startLeft: win.position.x, startTop: win.position.y })
              }}
            >
              <div className="flex items-center gap-2.5">
                <win.icon className="w-4 h-4" style={{ color: colorTheme.accent }} />
                <span className="text-xs font-semibold text-foreground/70">{win.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); minimizeApp(win.id) }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/30 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-foreground/30" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); closeApp(win.id) }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-foreground/30 hover:text-red-400" />
                </button>
              </div>
            </div>

            {/* Window Content */}
            <div className="h-[calc(100%-42px)] overflow-hidden">
              {win.component}
            </div>
          </div>
        )
      ))}



      <main className="relative z-10 h-full w-full">
        <div className={cn(
          "h-full w-full transition-all duration-500",
          (currentSection === "home" || currentSection === "metrics") ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none absolute inset-0"
        )}>
          {currentSection === "metrics" && IS_LANDING ? (
            <div className="min-h-screen px-8 py-16 pl-24 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 p-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl text-center max-w-sm">
                <Construction className="h-10 w-10" style={{ color: accentColor }} />
                <h2 className="text-xl font-bold" style={{ color: colorTheme?.foreground ?? '#fff' }}>
                  Metrics Dashboard
                </h2>
                <p className="text-sm" style={{ color: `${colorTheme?.foreground ?? '#fff'}70` }}>
                  Still under construction. Live system metrics coming soon.
                </p>
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase"
                  style={{ borderColor: `${accentColor}40`, color: accentColor }}
                >
                  Coming soon
                </div>
              </div>
            </div>
          ) : currentSection === "home" ? (
            <>
              <div
                style={{
                  opacity: 1 - scrollProgress * 1.5,
                  transform: `translateY(${-scrollProgress * 50}px)`,
                  transition: "opacity 0.1s ease-out, transform 0.1s ease-out",
                }}
              >
                <WelcomeSection onNavigate={handleNavigate} />
              </div>
              <div
                style={{
                  opacity: scrollProgress > 0.3 ? (scrollProgress - 0.3) / 0.7 : 0,
                  transform: `translateY(${(1 - scrollProgress) * 30}px)`,
                  transition: "opacity 0.1s ease-out, transform 0.1s ease-out",
                }}
              >
                <DashboardSection onExecContainer={(name) => { setExecTarget(name); setTerminalOpen(true) }} />
              </div>
            </>
          ) : (
            <MetricsSection />
          )}
        </div>
      </main>

      {/* Terminal Panel */}
      <TerminalPanel
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        execTarget={execTarget}
        onExecConsumed={() => setExecTarget(undefined)}
      />

      {/* Global Styles for Aurora Animation */}
      <style jsx global>{`
        @keyframes aurora {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          25% {
            transform: translate(3%, 3%) rotate(1deg) scale(1.02);
          }
          50% {
            transform: translate(-2%, 5%) rotate(-0.5deg) scale(0.98);
          }
          75% {
            transform: translate(5%, -3%) rotate(1.5deg) scale(1.01);
          }
        }

        /* macOS Dock-style bounce animation */
        @keyframes bounce-dock {
          0%, 100% { transform: translateY(0); }
          20% { transform: translateY(-8px); }
          40% { transform: translateY(2px); }
          60% { transform: translateY(-4px); }
          80% { transform: translateY(1px); }
        }

        .animate-bounce-dock {
          animation: bounce-dock 0.6s ease-in-out;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
