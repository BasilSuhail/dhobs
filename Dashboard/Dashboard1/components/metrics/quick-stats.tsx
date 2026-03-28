"use client"

import { Cpu, MemoryStick, Wifi, Gauge, Thermometer } from "lucide-react"

interface QuickStatsProps {
  stats: {
    cpu: string
    memBytes: string
    netDown: string
  } | null
}

export function QuickStats({ stats }: QuickStatsProps) {
  const displayStats = [
    { icon: Cpu, value: `${stats?.cpu || "0"}%`, label: "CPU", color: "#22d3ee" },
    { icon: MemoryStick, value: `${stats?.memBytes || "0"} GiB`, label: "Used", color: "#facc15" },
    { icon: Wifi, value: `${stats?.netDown || "0"} MB/s`, label: "Net In", color: "#22c55e" },
    { icon: Gauge, value: "---", label: "GPU", color: "#a855f7" },
    { icon: Thermometer, value: "---", label: "Temp", color: "#f97316" },
  ]

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-card rounded-xl border border-border shadow-sm">
      {displayStats.map((stat, index) => (
        <div key={index} className="flex items-center gap-2">
          <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
          <span className="text-sm font-bold tabular-nums text-foreground">{stat.value}</span>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-40 text-foreground">{stat.label}</span>
          {index < displayStats.length - 1 && (
            <span className="ml-3 w-px h-4 bg-border" />
          )}
        </div>
      ))}
    </div>
  )
}
