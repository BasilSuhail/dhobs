"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useTheme, colorThemes, type ColorTheme } from "@/components/theme-provider"
import {
  LayoutGrid,
  Settings,
  Palette,
  X,
  TerminalSquare,
  Activity,
  BrainCircuit,
  Check,
  type LucideIcon,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarProps {
  className?: string
  activeSection?: string
  onNavigate?: (section: string) => void
  terminalOpen?: boolean
  onToggleTerminal?: () => void
}

export function Sidebar({ 
  className, 
  activeSection = "home", 
  onNavigate, 
  terminalOpen, 
  onToggleTerminal
}: SidebarProps) {
  const IS_LANDING = process.env.NEXT_PUBLIC_LANDING_MODE === 'true'
  const [showSettings, setShowSettings] = useState(false)
  const [showThemes, setShowThemes] = useState(false)
  const { colorTheme, setColorTheme } = useTheme()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-4 top-1/2 z-50 flex -translate-y-1/2 flex-col",
          "rounded-2xl border py-3 shadow-2xl transition-all duration-500",
          "backdrop-blur-2xl shadow-black/10",
          className
        )}
        style={{ 
          backgroundColor: colorTheme.card,
          borderColor: colorTheme.border
        }}
      >
        {/* Logo */}
        <div className="flex justify-center px-3 pb-3 text-center">
          <div 
            className="flex h-9 w-9 items-center justify-center rounded-xl font-bold text-sm transition-transform active:scale-95 shadow-sm mx-auto"
            style={{ 
              backgroundColor: colorTheme.accent,
              color: colorTheme.accentForeground 
            }}
          >
            S
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px transition-colors duration-500" style={{ backgroundColor: colorTheme.border }} />

        {/* Main Navigation (Home & Metrics) */}
        <nav className="flex flex-col items-center gap-1 px-2 py-3">
          <NavButton 
            icon={LayoutGrid}
            label="Home"
            active={activeSection === "home" || activeSection === "dashboard"}
            onClick={() => onNavigate?.("home")}
            theme={colorTheme}
          />
          <NavButton
            icon={Activity}
            label="Metrics"
            active={activeSection === "metrics"}
            onClick={() => onNavigate?.("metrics")}
            theme={colorTheme}
          />
          {!IS_LANDING && (
            <NavButton
              icon={BrainCircuit}
              label="Ollama"
              active={activeSection === "ollama"}
              onClick={() => onNavigate?.("ollama")}
              theme={colorTheme}
            />
          )}
        </nav>

        {/* Divider */}
        <div className="mx-3 h-px transition-colors duration-500" style={{ backgroundColor: colorTheme.border }} />

        {/* Terminal + Settings */}
        <div className="flex flex-col items-center gap-1 px-2 pt-3 pb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleTerminal}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all"
                )}
                style={terminalOpen ? {
                  backgroundColor: colorTheme.accent,
                  color: colorTheme.accentForeground,
                } : {
                  color: colorTheme.muted,
                }}
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
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all"
                )}
                style={showSettings ? {
                  backgroundColor: `${colorTheme.accent}20`,
                  color: colorTheme.accent,
                } : {
                  color: colorTheme.muted,
                }}
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
              "rounded-2xl border p-3 w-48",
              "backdrop-blur-3xl shadow-2xl shadow-black/40",
              "animate-in slide-in-from-left-2 fade-in duration-200"
            )}
            style={{ 
              backgroundColor: colorTheme.card,
              borderColor: colorTheme.border
            }}
          >
            <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: colorTheme.border }}>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40" style={{ color: colorTheme.foreground }}>Settings</span>
              <button 
                onClick={() => { setShowSettings(false); setShowThemes(false); }} 
                className="ml-auto transition-colors opacity-40 hover:opacity-100"
                style={{ color: colorTheme.foreground }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            
            <button
              onClick={() => setShowThemes(!showThemes)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all"
              )}
              style={showThemes ? {
                backgroundColor: `${colorTheme.accent}20`,
                color: colorTheme.accent
              } : {
                color: colorTheme.foreground
              }}
            >
              <Palette className="h-4 w-4" />
              <span className="text-sm font-medium">Appearance</span>
            </button>
          </div>
        )}

        {/* Theme Selector Popup */}
        {showThemes && showSettings && (
          <div 
            className={cn(
              "absolute left-full top-1/2 ml-[210px] -translate-y-1/2",
              "rounded-3xl border p-5 w-[420px]",
              "backdrop-blur-3xl shadow-2xl shadow-black/50",
              "animate-in slide-in-from-left-4 fade-in duration-300"
            )}
            style={{ 
              backgroundColor: colorTheme.card,
              borderColor: colorTheme.border
            }}
          >
            <div className="flex items-center gap-2 mb-5 pb-3 border-b" style={{ borderColor: colorTheme.border }}>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40" style={{ color: colorTheme.foreground }}>Theme Library</span>
                <span className="text-xs font-medium opacity-60" style={{ color: colorTheme.foreground }}>Choose your visual workspace</span>
              </div>
              <button 
                onClick={() => setShowThemes(false)}
                className="ml-auto transition-colors opacity-40 hover:opacity-100 p-2 hover:bg-white/5 rounded-full"
                style={{ color: colorTheme.foreground }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
              {colorThemes.map((theme) => (
                <ThemeButton 
                  key={theme.id} 
                  theme={theme} 
                  active={colorTheme.id === theme.id}
                  currentTheme={colorTheme}
                  onClick={() => {
                    setColorTheme(theme)
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
  icon: Icon, 
  label, 
  active, 
  onClick,
  theme
}: { 
  icon: LucideIcon | React.ElementType
  label: string
  active?: boolean
  onClick?: () => void
  theme: ColorTheme
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={onClick} className="relative group outline-none">
          <div
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300",
              active && "shadow-lg"
            )}
            style={active ? { 
              backgroundColor: theme.accent,
              color: theme.accentForeground
            } : { 
              color: `${theme.foreground}60`,
            }}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function ThemeButton({ 
  theme, 
  active, 
  onClick,
  currentTheme
}: { 
  theme: ColorTheme
  active: boolean
  onClick: () => void
  currentTheme: ColorTheme
}) {
  const isLight = ["classic", "cloud", "chalk", "paper"].includes(theme.id);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-2xl transition-all border text-left active:scale-[0.97]",
        active ? "shadow-lg" : "hover:bg-white/5 border-transparent"
      )}
      style={{ 
        backgroundColor: active ? theme.accent : 'rgba(255,255,255,0.02)',
        borderColor: active ? theme.accent : currentTheme.border,
      }}
    >
      <div 
        className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border shadow-inner"
        style={{ 
          backgroundColor: theme.background, 
          borderColor: theme.border,
        }}
      >
        <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: theme.accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p 
          className="text-xs font-bold truncate leading-none mb-1" 
          style={{ color: active ? theme.accentForeground : currentTheme.foreground }}
        >
          {theme.name}
        </p>
        <div className="flex items-center gap-1.5">
          <span 
            className="text-[8px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md border"
            style={{ 
              color: active ? theme.accentForeground : currentTheme.foreground,
              borderColor: active ? `${theme.accentForeground}40` : currentTheme.border,
              opacity: 0.5
            }}
          >
            {isLight ? "Light" : "Dark"}
          </span>
          {active && <Check className="h-3 w-3" style={{ color: theme.accentForeground }} />}
        </div>
      </div>
    </button>
  )
}
