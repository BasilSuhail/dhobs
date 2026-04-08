"use client"

import { ArrowDownUp, Activity, AlertCircle } from "lucide-react"

interface SystemDiagnosticsProps {
  stats: {
    swap: { total: number; used: number; perc: number } | null
    loadAvg: { load1: number; load5: number; load15: number } | null
    netErrors: { rxErrors: number; txErrors: number; rxDropped: number; txDropped: number } | null
  } | null
}

function humanBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

export function SystemDiagnostics({ stats }: SystemDiagnosticsProps) {
  const totalNetIssues = (stats?.netErrors?.rxErrors ?? 0) + (stats?.netErrors?.txErrors ?? 0) +
    (stats?.netErrors?.rxDropped ?? 0) + (stats?.netErrors?.txDropped ?? 0)

  const panels = [
    {
      label: "Swap",
      value: stats?.swap ? `${stats.swap.perc.toFixed(0)}%` : "N/A",
      sub: stats?.swap ? `${humanBytes(stats.swap.used)} / ${humanBytes(stats.swap.total)}` : "Not configured",
      icon: ArrowDownUp,
      color: "#a855f7",
      warn: stats?.swap ? stats.swap.perc > 50 : false,
    },
    {
      label: "Load",
      value: stats?.loadAvg ? `${stats.loadAvg.load1.toFixed(2)}` : "N/A",
      sub: stats?.loadAvg ? `${stats.loadAvg.load5.toFixed(2)} · ${stats.loadAvg.load15.toFixed(2)}` : "—",
      icon: Activity,
      color: "#22d3ee",
      warn: false,
    },
    {
      label: "Net Issues",
      value: totalNetIssues > 0 ? `${totalNetIssues}` : "0",
      sub: totalNetIssues > 0 ? "Errors + dropped" : "Clean",
      icon: AlertCircle,
      color: totalNetIssues > 0 ? "#ef4444" : "#22c55e",
      warn: totalNetIssues > 0,
    },
  ]

  return (
    <div className="flex gap-3">
      {panels.map(panel => (
        <div key={panel.label} className="flex-1 bg-card rounded-xl border border-border p-2.5 flex flex-col shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 shrink-0 mb-1">
            <panel.icon className="w-3 h-3" style={{ color: panel.color }} />
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 text-foreground">{panel.label}</span>
          </div>
          <div className="flex-1 flex items-baseline gap-1.5 min-h-0">
            <span className={`text-lg font-bold tabular-nums ${panel.warn ? 'text-red-400' : 'text-foreground'}`}>
              {panel.value}
            </span>
          </div>
          <div className="text-[8px] font-mono opacity-30 text-foreground truncate mt-0.5">
            {panel.sub}
          </div>
        </div>
      ))}
    </div>
  )
}
