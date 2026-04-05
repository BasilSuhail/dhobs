"use client"

import { useEffect, useRef, useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { WelcomeSection } from "@/components/dashboard/welcome-section"
import { DashboardSection } from "@/components/dashboard/dashboard-section"
import { MetricsSection } from "@/components/dashboard/metrics-section"
import { OllamaSection } from "@/components/dashboard/ollama-section"
import { TerminalPanel } from "@/components/dashboard/terminal-panel"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Construction } from "lucide-react"
export default function HomePage() {
  const IS_LANDING = process.env.NEXT_PUBLIC_LANDING_MODE === 'true'
  const { colorTheme } = useTheme()
  const [scrollProgress, setScrollProgress] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [execTarget, setExecTarget] = useState<string | undefined>()
  const [currentSection, setCurrentSection] = useState("home")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || currentSection !== "home") return
      const scrollTop = window.scrollY
      const windowHeight = window.innerHeight
      // Calculate progress based on first screen scroll
      const progress = Math.min(scrollTop / windowHeight, 1)
      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [currentSection])

  const bgColor = mounted ? colorTheme.background : "#0a0a0a"
  const accentColor = mounted ? colorTheme.accent : "#d4e157"

  const handleNavigate = (section: string) => {
    setCurrentSection(section)
    if (section === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

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
        activeSection={currentSection}
        onNavigate={handleNavigate}
        terminalOpen={terminalOpen}
        onToggleTerminal={() => setTerminalOpen(prev => !prev)}
      />

      <main className="relative z-10 h-full w-full">
        {/* HOME / METRICS VIEW (Static / Scrollable) */}
        {/* OLLAMA SECTION */}
        <div className={cn(
          "h-full w-full transition-all duration-500",
          currentSection === "ollama" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none absolute inset-0"
        )}>
          <OllamaSection />
        </div>

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
