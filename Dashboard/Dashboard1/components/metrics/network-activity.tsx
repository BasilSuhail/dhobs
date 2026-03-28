"use client"

import { Wifi } from "lucide-react"
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"

interface NetworkHistoryPoint {
  time: string
  down: number
  up: number
}

interface NetworkActivityProps {
  stats: {
    netDown: string
    netUp: string
  } | null
  history: NetworkHistoryPoint[]
}

export function NetworkActivity({ stats, history }: NetworkActivityProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 h-full flex flex-col shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-1.5 shrink-0">
        <Wifi className="w-3.5 h-3.5 text-[#a855f7] shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground truncate">Network Activity</span>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontSize: "10px",
                backdropFilter: "blur(10px)"
              }}
              labelStyle={{ opacity: 0.4 }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)} MB`,
                name === "down" ? "Download" : "Upload"
              ]}
            />
            <Area
              type="monotone"
              dataKey="down"
              name="down"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#downGrad)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="up"
              name="up"
              stroke="#a855f7"
              strokeWidth={2}
              fill="url(#upGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 pt-1.5 border-t border-border mt-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
          <span className="text-[9px] font-bold text-foreground">Down: {stats?.netDown || "0"}MB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
          <span className="text-[9px] font-bold text-foreground">Up: {stats?.netUp || "0"}MB</span>
        </div>
      </div>
    </div>
  )
}
