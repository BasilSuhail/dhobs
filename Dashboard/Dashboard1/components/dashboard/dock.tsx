"use client"

import React, { useEffect, useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { LucideIcon } from "lucide-react"

export interface DockApp {
  id: string
  name: string
  icon: LucideIcon | React.ElementType
  isOpen: boolean
  isActive: boolean
  isClosing?: boolean
}

interface DockProps {
  apps: DockApp[]
  onAppClick: (id: string) => void
}

export function Dock({ apps, onAppClick }: DockProps) {
  const { colorTheme } = useTheme()

  return (
    <TooltipProvider delayDuration={0}>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-3 py-2 rounded-2xl border flex items-end gap-2 shadow-2xl backdrop-blur-3xl transition-all duration-500"
        style={{ 
          backgroundColor: `${colorTheme.card}80`,
          borderColor: colorTheme.border,
        }}
      >
        {apps.map((app) => (
          <DockIcon 
            key={app.id} 
            app={app} 
            onClick={() => onAppClick(app.id)}
            theme={colorTheme}
          />
        ))}
      </div>
    </TooltipProvider>
  )
}

function DockIcon({ 
  app, 
  onClick,
  theme 
}: { 
  app: DockApp
  onClick: () => void
  theme: any
}) {
  const Icon = app.icon
  const [isBouncing, setIsBouncing] = useState(false)

  useEffect(() => {
    if (app.isActive) {
      setIsBouncing(true)
      const timer = setTimeout(() => setIsBouncing(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [app.isActive])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => {
            setIsBouncing(true)
            setTimeout(() => setIsBouncing(false), 600)
            onClick()
          }}
          className={cn(
            "relative group flex flex-col items-center transition-all duration-500",
            app.isClosing ? "opacity-40 grayscale scale-90" : "opacity-100 grayscale-0 scale-100"
          )}
        >
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 shadow-lg",
              isBouncing && "animate-bounce",
              app.isActive ? "scale-110" : "scale-100 hover:scale-105"
            )}
            style={{ 
              backgroundColor: app.isActive ? theme.accent : `${theme.accent}15`,
              color: app.isActive ? theme.accentForeground : theme.accent,
              border: `1px solid ${app.isActive ? theme.accent : `${theme.accent}30`}`
            }}
          >
            <Icon className="h-6 w-6" strokeWidth={1.5} />
          </div>
          
          {/* Active Indicator */}
          {app.isOpen && !app.isClosing && (
            <div 
              className="absolute -bottom-1 w-1 h-1 rounded-full transition-all duration-500"
              style={{ backgroundColor: theme.accent }}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={10}>
        <p className="text-xs font-bold">{app.name}</p>
      </TooltipContent>
    </Tooltip>
  )
}
