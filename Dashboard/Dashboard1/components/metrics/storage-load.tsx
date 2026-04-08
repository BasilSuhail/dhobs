"use client"

import { Database } from "lucide-react"

interface StorageStat {
  name: string
  size: string
  bytes: number
}

interface StorageLoadProps {
  stats: {
    storage: StorageStat[]
  } | null
}

const STORAGE_COLORS = ['bg-[#d4e157]', 'bg-[#22d3ee]', 'bg-[#a855f7]', 'bg-[#fb923c]', 'bg-[#ec4899]', 'bg-[#22c55e]', 'bg-[#3b82f6]']

function humanSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb.toFixed(0)} MB`
}

export function StorageLoad({ stats }: StorageLoadProps) {
  const storageData = stats?.storage || []
  const totalBytes = storageData.reduce((sum, s) => sum + s.bytes, 0)

  return (
    <div className="bg-card rounded-xl border border-border p-3 h-full flex flex-col shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-1.5 shrink-0">
        <Database className="w-3.5 h-3.5 text-[#a855f7] shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground truncate">Storage Load</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
        {storageData.length > 0 ? storageData.map((item, i) => {
          const pct = totalBytes > 0 ? ((item.bytes / totalBytes) * 100).toFixed(1) : '0'
          const mb = item.size
          return (
            <div key={item.name} className="shrink-0">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter mb-0.5">
                <span className="opacity-40 text-foreground truncate pr-2">{item.name}</span>
                <span className="text-foreground shrink-0">{humanSize(parseFloat(mb))} ({pct}%)</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${STORAGE_COLORS[i % STORAGE_COLORS.length]} rounded-full transition-all duration-1000`}
                  style={{ width: `${Math.max(2, Math.min(100, parseFloat(pct)))}%` }}
                />
              </div>
            </div>
          )
        }) : (
          <div className="flex-1 flex items-center justify-center text-[8px] opacity-20 uppercase font-black">Mapping Data...</div>
        )}
      </div>
    </div>
  )
}
