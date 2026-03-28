"use client"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { X, Minus } from "lucide-react"

interface WindowWrapperProps {
  children: React.ReactNode
  title: string
  onClose: () => void
  onMinimize: () => void
  isActive?: boolean
  onClick?: () => void
}

export function WindowWrapper({ 
  children, 
  title, 
  onClose, 
  onMinimize, 
  isActive,
  onClick
}: WindowWrapperProps) {
  const { colorTheme, mode } = useTheme()

  return (
    <div 
      onClick={onClick}
      className={cn(
        "absolute inset-0 flex flex-col pl-20 pt-4 pb-4 pr-4 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
        isActive ? "z-20 opacity-100 scale-100 translate-y-0" : "z-10 opacity-0 scale-[0.98] translate-y-4 pointer-events-none"
      )}
    >
      <div 
        className={cn(
          "flex-1 w-full rounded-2xl border overflow-hidden flex flex-col shadow-2xl transition-all duration-500",
          isActive ? "shadow-black/40" : "shadow-transparent"
        )}
        style={{ 
          backgroundColor: colorTheme.card,
          borderColor: colorTheme.border,
          backdropFilter: "blur(40px) saturate(150%)",
          WebkitBackdropFilter: "blur(40px) saturate(150%)"
        }}
      >
        {/* Window Header */}
        <div 
          className="h-11 flex items-center justify-between px-5 border-b select-none transition-colors duration-500"
          style={{ 
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            borderColor: colorTheme.border 
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40" style={{ color: colorTheme.foreground }}>
              {title}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onMinimize(); }}
              className="p-2 rounded-lg transition-all active:scale-90 opacity-30 hover:opacity-100"
              style={{ color: colorTheme.foreground }}
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-2 rounded-lg transition-all active:scale-90 opacity-30 hover:opacity-100 hover:text-red-500"
              style={{ color: colorTheme.foreground }}
              title="Close"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative" style={{ backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
