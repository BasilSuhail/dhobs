"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useTheme, colorThemes, type ColorTheme } from "@/components/theme-provider"
import {
  LayoutGrid,
  Play,
  HardDrive,
  Cloud,
  Code,
  Activity,
  Settings,
  Palette,
  X,
  TerminalSquare,
  MessageSquare,
  Key,
  Book,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  icon: React.ElementType
  label: string
  id: string
  url?: string
}

const navItems: NavItem[] = [
  { icon: LayoutGrid, label: "Home", id: "home" },
  { icon: Play, label: "Media", id: "media" },
  { icon: Cloud, label: "Nextcloud", id: "nextcloud", url: "http://localhost:8081" },
  { icon: MessageSquare, label: "Matrix", id: "matrix" },
  { icon: Key, label: "Vaultwarden", id: "vaultwarden" },
  { icon: Book, label: "Kiwix", id: "kiwix" },
  { icon: Code, label: "Code Space", id: "codespace", url: "http://localhost:3030" },
  { icon: Activity, label: "Metrics", id: "metrics" },
]

interface SidebarProps {
  className?: string
  activeSection?: string
  onNavigate?: (section: string) => void
  terminalOpen?: boolean
  onToggleTerminal?: () => void
}

export function Sidebar({ className, activeSection = "dashboard", onNavigate, terminalOpen, onToggleTerminal }: SidebarProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [showThemes, setShowThemes] = useState(false)
  const { colorTheme, setColorTheme } = useTheme()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-4 top-1/2 z-50 flex -translate-y-1/2 flex-col",
          "rounded-2xl border border-white/[0.08] bg-black/40 py-3",
          "backdrop-blur-2xl shadow-2xl shadow-black/20",
          className
        )}
      >
        {/* Logo */}
        <div className="flex justify-center px-3 pb-3">
          <div 
            className="flex h-9 w-9 items-center justify-center rounded-xl font-bold text-sm"
            style={{ 
              backgroundColor: colorTheme.accent,
              color: colorTheme.accentForeground 
            }}
          >
            S
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-white/[0.06]" />

        {/* Main Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-1 px-2 py-3">
          {navItems.map((item) => (
            <NavButton 
              key={item.id} 
              item={item} 
              active={activeSection === item.id}
              onClick={() => onNavigate?.(item.id)}
              accentColor={colorTheme.accent}
            />
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-3 h-px bg-white/[0.06]" />

        {/* Terminal + Settings */}
        <div className="flex flex-col items-center gap-1 px-2 pt-3 pb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleTerminal}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  terminalOpen
                    ? "text-white shadow-lg"
                    : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                )}
                style={terminalOpen ? {
                  backgroundColor: colorTheme.accent,
                  color: colorTheme.accentForeground,
                } : undefined}
              >
                <TerminalSquare className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              <p>Terminal</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  showSettings 
                    ? "bg-white/10 text-white" 
                    : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                )}
              >
                <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Settings Popup */}
        {showSettings && (
          <div 
            className={cn(
              "absolute left-full top-1/2 ml-3 -translate-y-1/2",
              "rounded-2xl border border-white/[0.08] bg-black/60 p-3",
              "backdrop-blur-2xl shadow-2xl shadow-black/40",
              "animate-in slide-in-from-left-2 fade-in duration-200"
            )}
          >
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Settings</span>
              <button 
                onClick={() => setShowSettings(false)}
                className="ml-auto text-white/40 hover:text-white/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <button
              onClick={() => setShowThemes(!showThemes)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all",
                showThemes 
                  ? "bg-white/10 text-white" 
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Palette className="h-4 w-4" />
              <span className="text-sm">Color themes</span>
            </button>
          </div>
        )}

        {/* Theme Selector Popup */}
        {showThemes && showSettings && (
          <div 
            className={cn(
              "absolute left-full top-1/2 ml-[140px] -translate-y-1/2",
              "rounded-2xl border border-white/[0.08] bg-black/70 p-4",
              "backdrop-blur-2xl shadow-2xl shadow-black/40",
              "animate-in slide-in-from-left-2 fade-in duration-200",
              "w-[320px]"
            )}
          >
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Color Themes</span>
              <button 
                onClick={() => setShowThemes(false)}
                className="ml-auto text-white/40 hover:text-white/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {colorThemes.map((theme) => (
                <ThemeButton 
                  key={theme.id} 
                  theme={theme} 
                  active={colorTheme.id === theme.id}
                  onClick={() => {
                    setColorTheme(theme)
                    setShowThemes(false)
                    setShowSettings(false)
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}

function NavButton({ 
  item, 
  active, 
  onClick,
  accentColor 
}: { 
  item: NavItem
  active?: boolean
  onClick?: () => void
  accentColor: string
}) {
  const Icon = item.icon
  const isLink = !!item.url

  const content = (
    <div
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-xl transition-all",
        active
          ? "text-white shadow-lg"
          : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
      )}
      style={active ? { 
        backgroundColor: accentColor,
        color: '#0a0a0a'
      } : undefined}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
    </div>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {isLink ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {content}
          </a>
        ) : (
          <button
            onClick={onClick}
            className="block"
          >
            {content}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        <p>{item.label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function ThemeButton({ 
  theme, 
  active, 
  onClick 
}: { 
  theme: ColorTheme
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-lg p-2 transition-all",
        "hover:scale-105 active:scale-95",
        active && "ring-2 ring-white/30"
      )}
      style={{ 
        backgroundColor: theme.preview.bg,
        border: theme.preview.border ? `1px solid ${theme.preview.border}` : '1px solid transparent'
      }}
    >
      <span 
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: theme.preview.text }}
      >
        {theme.name}
      </span>
      {active && (
        <div 
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-black"
          style={{ backgroundColor: theme.preview.accent }}
        />
      )}
    </button>
  )
}
