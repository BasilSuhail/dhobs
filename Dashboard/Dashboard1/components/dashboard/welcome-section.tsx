"use client"

import { useTheme } from "@/components/theme-provider"
import {
  Play,
  HardDrive,
  Code,
  MessageSquare,
  Key,
  Home,
  Database,
  Shield,
  Cloud,
  Rss,
  Film,
  Music,
  Server,
  Wifi,
  Monitor,
  Folder,
} from "lucide-react"

const applications = [
  { name: "Jellyfin", url: "http://localhost:8096", icon: Play },
  { name: "Nextcloud", url: "http://localhost:8081", icon: Cloud },
  { name: "Code Server", url: "http://localhost:3030", icon: Code },
  { name: "Matrix", url: "http://localhost:8082", icon: MessageSquare },
  { name: "Vaultwarden", url: "vault.example.com", icon: Key },
  { name: "Home Assistant", url: "home.example.com", icon: Home },
  { name: "PostgreSQL", url: "db.example.com", icon: Database },
  { name: "Authelia", url: "auth.example.com", icon: Shield },
  { name: "Plex", url: "plex.example.com", icon: Film },
  { name: "Navidrome", url: "music.example.com", icon: Music },
  { name: "Portainer", url: "docker.example.com", icon: Server },
  { name: "Pi-hole", url: "pihole.example.com", icon: Wifi },
  { name: "Grafana", url: "grafana.example.com", icon: Monitor },
  { name: "Filebrowser", url: "files.example.com", icon: Folder },
  { name: "Miniflux", url: "rss.example.com", icon: Rss },
  { name: "Syncthing", url: "sync.example.com", icon: HardDrive },
]

const bookmarks = {
  Communicate: [
    { name: "Discord", url: "discord.com" },
    { name: "Gmail", url: "gmail.com" },
    { name: "Slack", url: "slack.com" },
  ],
  Cloud: [
    { name: "Box", url: "box.com" },
    { name: "Dropbox", url: "dropbox.com" },
    { name: "Drive", url: "drive.google.com" },
  ],
  Design: [
    { name: "Awwwards", url: "awwwards.com" },
    { name: "Dribbble", url: "dribbble.com" },
    { name: "Muz.li", url: "muz.li" },
  ],
  Dev: [
    { name: "Codepen", url: "codepen.io" },
    { name: "Devdocs", url: "devdocs.io" },
    { name: "GitHub", url: "github.com" },
  ],
  Media: [
    { name: "Spotify", url: "spotify.com" },
    { name: "YouTube", url: "youtube.com" },
    { name: "Netflix", url: "netflix.com" },
  ],
  Tech: [
    { name: "Hacker News", url: "news.ycombinator.com" },
    { name: "The Verge", url: "theverge.com" },
    { name: "Ars Technica", url: "arstechnica.com" },
  ],
}

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
  const { colorTheme } = useTheme()

  return (
    <section className="min-h-screen px-8 py-16 pl-24">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-16">
          <p className="text-sm font-medium tracking-wider text-foreground/50 mb-2">
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
              const isInternal = app.name === "Jellyfin" || app.name === "Matrix"
              const sectionId = app.name.toLowerCase()
              const href = app.url.startsWith('http') ? app.url : `https://${app.url}`
              
              if (isInternal) {
                return (
                  <button
                    key={app.name}
                    onClick={() => onNavigate?.(sectionId)}
                    className="group flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.04] active:scale-[0.98] text-left w-full"
                    style={{
                      animationDelay: `${index * 30}ms`,
                    }}
                  >
                    <div 
                      className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: `${colorTheme.accent}15`,
                      }}
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
                      <p className="text-xs text-foreground/40 truncate uppercase tracking-wider">
                        Integrated
                      </p>
                    </div>
                  </button>
                )
              }

              return (
                <a
                  key={app.name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.04] active:scale-[0.98]"
                  style={{
                    animationDelay: `${index * 30}ms`,
                  }}
                >
                  <div 
                    className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: `${colorTheme.accent}15`,
                    }}
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
                    <p className="text-xs text-foreground/40 truncate uppercase tracking-wider">
                      {app.url}
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        </div>

        {/* Bookmarks */}
        <div>
          <h2 
            className="text-sm font-bold tracking-wider mb-6 uppercase"
            style={{ color: colorTheme.foreground }}
          >
            Bookmarks
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {Object.entries(bookmarks).map(([category, links]) => (
              <div key={category}>
                <h3 
                  className="text-xs font-semibold tracking-wider mb-3 uppercase"
                  style={{ color: colorTheme.accent }}
                >
                  {category}
                </h3>
                <ul className="space-y-2">
                  {links.map((link) => {
                    const href = link.url.startsWith('http') ? link.url : `https://${link.url}`
                    return (
                      <li key={link.name}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                        >
                          {link.name}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="flex justify-center mt-20">
          <div className="flex flex-col items-center gap-2 text-foreground/30">
            <span className="text-xs uppercase tracking-wider">Scroll for dashboard</span>
            <div className="w-px h-8 bg-gradient-to-b from-foreground/30 to-transparent animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  )
}
