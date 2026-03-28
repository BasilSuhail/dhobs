"use client"

import { Box } from "lucide-react"

interface ContainerStat {
  name: string
  status: string
  cpu: string
  mem: string
}

interface ActiveInfrastructureProps {
  stats: {
    containers: ContainerStat[]
  } | null
}

export function ActiveInfrastructure({ stats }: ActiveInfrastructureProps) {
  const containers = stats?.containers || []

  return (
    <div className="bg-card rounded-xl border border-border p-3 h-full flex flex-col shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <Box className="w-3.5 h-3.5 text-[#d4e157] shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground">Active Infrastructure</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="grid grid-cols-5 gap-2 content-start">
          {containers.length > 0 ? containers.map((container) => (
            <div
              key={container.name}
              className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-lg px-2.5 py-1.5 transition-all hover:bg-white/[0.05]"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black text-foreground truncate uppercase tracking-tighter">{container.name}</div>
                <div className="text-[8px] font-mono opacity-30 text-foreground">CPU: {container.cpu}</div>
              </div>
              <span className="ml-2 px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[7px] font-black uppercase shrink-0 border border-green-500/20">
                UP
              </span>
            </div>
          )) : (
            <div className="col-span-5 flex items-center justify-center py-6 opacity-10 uppercase text-[10px] font-black tracking-widest border-2 border-dashed rounded-xl">
              Awaiting Handshake...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
