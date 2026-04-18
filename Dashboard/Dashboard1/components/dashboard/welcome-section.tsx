"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import {
  Play,
  Code,
  MessageSquare,
  Key,
  Cloud,
  Book,
  BrainCircuit,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AppHoverCard } from "@/components/dashboard/app-hover-card"
import { HOVER_CARDS } from "@/lib/landing-data"

const SERVICE_PORTS = [
  { name: "Jellyfin", port: 8096, icon: Play },
  { name: "Nextcloud", port: 8081, icon: Cloud },
  { name: "Theia IDE", port: 3030, icon: Code },
  { name: "Matrix", port: 8082, icon: MessageSquare },
  { name: "Vaultwarden", port: 8083, icon: Key },
  { name: "Kiwix", port: 8087, icon: Book, section: "kiwix" },
  { name: "Ollama", icon: BrainCircuit, section: "ollama" },
  { name: "Open WebUI", port: 8085, icon: MessageSquare },
  { name: "VPN Manager", port: 8090, icon: Shield },
]


function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning!"
  if (hour < 18) return "Good afternoon!"
  return "Good evening!"
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase()
}

interface WelcomeSectionProps {
  onNavigate?: (section: string) => void
}

export function WelcomeSection({ onNavigate }: WelcomeSectionProps) {
  const IS_LANDING = process.env.NEXT_PUBLIC_LANDING_MODE === 'true'
  const { colorTheme } = useTheme()
  const [hostname, setHostname] = useState("")
  const router = useRouter()

  useEffect(() => {
    setHostname(window.location.hostname)
  }, [])

  const applications = useMemo(
    () =>
      SERVICE_PORTS
        .map((svc) => ({
          name: svc.name,
          url: 'port' in svc && hostname ? `http://${hostname}:${svc.port}` : "",
          icon: svc.icon,
          route: 'route' in svc ? (svc as { route: string }).route : undefined,
          section: 'section' in svc ? (svc as { section: string }).section : undefined,
        })),
    [hostname]
  )

  return (
    <section className="min-h-screen px-8 py-16 pl-24 transition-colors duration-500">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-16">
          <p className="text-sm font-medium tracking-wider mb-2 opacity-50" style={{ color: colorTheme.foreground }}>
            {formatDate()}
          </p>
          <h1 
            className="text-5xl md:text-6xl font-bold tracking-tight"
            style={{ color: colorTheme.foreground }}
          >
            {getGreeting()}
          </h1>
        </header>

        {/* Applications */}
        <div className="mb-16">
          <h2 
            className="text-sm font-bold tracking-wider mb-6 uppercase"
            style={{ color: colorTheme.foreground }}
          >
            Applications
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {applications.map((app, index) => {
              const Icon = app.icon

              const cardClasses = cn(
                "group flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] text-left w-full border shadow-sm",
                "hover:shadow-md transition-all duration-300 hover:bg-white/[0.04]"
              )
              const cardStyle = {
                animationDelay: `${index * 30}ms`,
                backgroundColor: colorTheme.card,
                borderColor: colorTheme.border,
              }
              const cardContent = (
                <>
                  <div 
                    className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                    style={{ backgroundColor: `${colorTheme.accent}15` }}
                  >
                    <Icon 
                      className="h-5 w-5 transition-colors" 
                      strokeWidth={1.5}
                      style={{ color: colorTheme.accent }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p 
                      className="text-sm font-semibold truncate"
                      style={{ color: colorTheme.foreground }}
                    >
                      {app.name}
                    </p>
                    <p className="text-[10px] truncate uppercase tracking-widest opacity-40" style={{ color: colorTheme.foreground }}>
                      {(app.section || app.route) ? "Internal" : "External"}
                    </p>
                  </div>
                </>
              )

              if (IS_LANDING) {
                return (
                  <AppHoverCard
                    key={app.name}
                    name={app.name}
                    card={HOVER_CARDS[app.name] ?? { tagline: app.name, flow: ['—', '—', '—'] }}
                  >
                    <div className={cardClasses} style={{ ...cardStyle, cursor: 'default' }}>
                      {cardContent}
                    </div>
                  </AppHoverCard>
                )
              }

              if (app.section) {
                return (
                  <button
                    key={app.name}
                    onClick={() => onNavigate?.(app.section!)}
                    className={cardClasses}
                    style={cardStyle}
                  >
                    {cardContent}
                  </button>
                )
              }

              if (app.route) {
                return (
                  <button
                    key={app.name}
                    onClick={() => router.push(app.route!)}
                    className={cardClasses}
                    style={cardStyle}
                  >
                    {cardContent}
                  </button>
                )
              }

              return (
                <a
                  key={app.name}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClasses}
                  style={cardStyle}
                >
                  {cardContent}
                </a>
              )
            })}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="flex justify-center mt-20">
          <div className="flex flex-col items-center gap-2 opacity-30" style={{ color: colorTheme.foreground }}>
            <span className="text-xs uppercase tracking-wider">Scroll for dashboard</span>
            <div className="w-px h-8 bg-gradient-to-b from-current to-transparent animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  )
}
