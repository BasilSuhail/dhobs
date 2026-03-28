"use client"

import { useEffect, useRef, useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { WelcomeSection } from "@/components/dashboard/welcome-section"
import { DashboardSection } from "@/components/dashboard/dashboard-section"
import { MediaSection } from "@/components/dashboard/media-section"
import { MatrixSection } from "@/components/dashboard/matrix-section"
import { StorageSection } from "@/components/dashboard/storage-section"
import { TerminalPanel } from "@/components/dashboard/terminal-panel"
import { useTheme } from "@/components/theme-provider"

export default function HomePage() {
  const { colorTheme } = useTheme()
  const [scrollProgress, setScrollProgress] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
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

  // Use default background before mount to prevent hydration mismatch
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
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
        activeSection={currentSection === "home" ? "dashboard" : currentSection}
        onNavigate={handleNavigate}
        terminalOpen={terminalOpen}
        onToggleTerminal={() => setTerminalOpen(prev => !prev)}
      />

      {currentSection === "home" ? (
        <>
          {/* Welcome Section with fade out on scroll */}
          <div
            style={{
              opacity: 1 - scrollProgress * 1.5,
              transform: `translateY(${-scrollProgress * 50}px)`,
              transition: "opacity 0.1s ease-out, transform 0.1s ease-out",
            }}
          >
            <WelcomeSection onNavigate={handleNavigate} />
          </div>
          {/* Dashboard Section with fade in on scroll */}
          <div
            style={{
              opacity: scrollProgress > 0.3 ? (scrollProgress - 0.3) / 0.7 : 0,
              transform: `translateY(${(1 - scrollProgress) * 30}px)`,
              transition: "opacity 0.1s ease-out, transform 0.1s ease-out",
            }}
          >
            <DashboardSection />
          </div>
        </>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {(currentSection === "media" || currentSection === "jellyfin") && <MediaSection />}
          {currentSection === "matrix" && <MatrixSection />}
          {currentSection === "storage" && <StorageSection />}
          {/* Add other sections here as needed */}
        </div>
      )}

      {/* Terminal Panel */}
      <TerminalPanel open={terminalOpen} onClose={() => setTerminalOpen(false)} />

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
