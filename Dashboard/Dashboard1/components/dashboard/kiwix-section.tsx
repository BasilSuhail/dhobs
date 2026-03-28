"use client"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function KiwixSection() {
  const { colorTheme } = useTheme()

  return (
    <section className="h-screen w-full pl-20 pt-4 pb-4 pr-4 overflow-hidden flex flex-col">
      <div 
        className={cn(
          "flex-1 w-full rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl overflow-hidden relative"
        )}
      >
        <iframe 
          src="http://localhost:8084" 
          className="w-full h-full border-0"
          title="Kiwix Offline Knowledge Base"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        
        {/* Overlay to catch errors or show loading if needed */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
           <div className="bg-black/60 px-4 py-2 rounded-full text-xs text-white/40">
             Embedded Kiwix Instance
           </div>
        </div>
      </div>
    </section>
  )
}
