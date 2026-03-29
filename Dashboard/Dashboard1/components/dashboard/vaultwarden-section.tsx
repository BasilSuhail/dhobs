"use client"

import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

interface VaultwardenSectionProps {
  isWindow?: boolean
}

export function VaultwardenSection({ isWindow }: VaultwardenSectionProps) {
  const { colorTheme } = useTheme()
  const [serviceUrl, setServiceUrl] = useState("")

  useEffect(() => {
    setServiceUrl(`http://${window.location.hostname}:8083`)
  }, [])

  const content = (
    <div
      className={cn(
        "flex-1 w-full overflow-hidden relative",
        !isWindow && "rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl"
      )}
    >
      {serviceUrl && (
        <iframe
          src={serviceUrl}
          className="w-full h-full border-0"
          title="Vaultwarden Password Manager"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      
      {/* Overlay to catch errors or show loading if needed */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
         <div className="bg-black/60 px-4 py-2 rounded-full text-xs text-white/40 uppercase tracking-widest">
           Embedded Vaultwarden Instance
         </div>
      </div>
    </div>
  )

  if (isWindow) {
    return <div className="w-full h-full flex flex-col">{content}</div>
  }

  return (
    <section className="h-screen w-full pl-20 pt-4 pb-4 pr-4 overflow-hidden flex flex-col">
      {content}
    </section>
  )
}
