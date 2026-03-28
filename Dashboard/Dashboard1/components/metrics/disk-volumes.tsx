"use client"

import { HardDrive } from "lucide-react"
import { cn } from "@/lib/utils"

interface StorageStat {
  name: string
  size: string
  bytes: number
}

interface DiskVolumesProps {
  stats: {
    storage: StorageStat[]
  } | null
}

export function DiskVolumes({ stats }: DiskVolumesProps) {
  const volumes = stats?.storage.slice(0, 2) || []

  return (
    <div className="bg-card rounded-xl border border-border p-3 h-full flex flex-col shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-1.5 shrink-0">
        <HardDrive className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground truncate">Disk Volumes</span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-around gap-2 overflow-hidden">
        {volumes.length > 0 ? volumes.map((volume, i) => (
          <div key={volume.name} className="shrink-0">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter mb-0.5">
              <span className="opacity-40 text-foreground truncate pr-2">{volume.name}</span>
              <span className="text-foreground shrink-0">{volume.size} MB</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  i === 0 ? "bg-green-500" : "bg-yellow-500"
                )}
                style={{ width: `${Math.min(100, (volume.bytes / 50000000) * 100)}%` }}
              />
            </div>
          </div>
        )) : (
          <div className="flex-1 flex items-center justify-center text-[8px] opacity-20 uppercase font-black">Mapping Data...</div>
        )}
      </div>
    </div>
  )
}
