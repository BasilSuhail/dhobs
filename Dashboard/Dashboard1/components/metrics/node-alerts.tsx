"use client"

import { AlertTriangle, Server } from "lucide-react"

interface ContainerStat {
  name: string
  status: string
  cpu: string
  mem: string
}

interface NodeAlertsProps {
  stats: {
    containers: ContainerStat[]
  } | null
}

export function NodeAlerts({ stats }: NodeAlertsProps) {
  const alerts = stats?.containers.slice(0, 3) || []

  return (
    <div className="bg-card rounded-xl border border-border p-3 h-full flex flex-col shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-1.5 shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-[#fb923c] shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground truncate">Node Alerts</span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-around gap-1 overflow-hidden">
        {alerts.length > 0 ? alerts.map((alert) => (
          <div
            key={alert.name}
            className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-lg px-2 py-1 shrink-0"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Server className="w-3 h-3 opacity-30 text-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-black text-foreground truncate uppercase">{alert.name}</div>
                <div className="text-[8px] font-mono opacity-30 text-foreground truncate">
                  {alert.cpu} | {alert.mem.split(' / ')[0]}
                </div>
              </div>
            </div>
            <span className="ml-2 px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[7px] font-black uppercase shrink-0 border border-green-500/20">
              OK
            </span>
          </div>
        )) : (
          <div className="flex-1 flex items-center justify-center text-[8px] opacity-20 uppercase font-black">Scanning Nodes...</div>
        )}
      </div>
    </div>
  )
}
