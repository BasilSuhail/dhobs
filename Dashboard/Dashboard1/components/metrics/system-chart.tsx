"use client"

import { useState, useRef } from "react"
import { Activity, ChevronDown } from "lucide-react"
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts"

interface SystemHistoryPoint {
  time: string
  cpu: number
  memory: number
  gpu: number
  storage: number
}

interface SystemChartProps {
  data: SystemHistoryPoint[]
}

const metricOptions = [
  { key: "all", label: "All Metrics" },
  { key: "cpu", label: "CPU" },
  { key: "memory", label: "Memory" },
  { key: "gpu", label: "GPU" },
  { key: "storage", label: "Storage" },
]

const metricColors: Record<string, string> = {
  cpu: "#22d3ee",
  memory: "#facc15",
  gpu: "#a855f7",
  storage: "#22c55e",
}

export function SystemChart({ data }: SystemChartProps) {
  const [filter, setFilter] = useState("all")
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLabel = metricOptions.find(m => m.key === filter)?.label || "All Metrics"
  const showMetric = (key: string) => filter === "all" || filter === key

  return (
    <div className="bg-card rounded-xl border border-border p-3 h-full flex flex-col shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#d4e157] shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground">System Performance</span>
        </div>
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase bg-secondary/20 rounded border border-border hover:bg-secondary/40 transition-all text-foreground/60"
          >
            {currentLabel}
            <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isOpen && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden min-w-[120px]">
              {metricOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => { setFilter(option.key); setIsOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all hover:bg-white/5 ${
                    filter === option.key ? 'text-foreground bg-white/5' : 'text-foreground/50'
                  }`}
                >
                  {option.key !== "all" && (
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: metricColors[option.key] }}
                    />
                  )}
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#facc15" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }}
              domain={[0, 100]}
              ticks={[0, 50, 100]}
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
              formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name.charAt(0).toUpperCase() + name.slice(1)]}
            />
            {showMetric("cpu") && (
              <Area
                type="monotone"
                dataKey="cpu"
                name="CPU"
                stroke="#22d3ee"
                strokeWidth={2}
                fill="url(#cpuGrad)"
                isAnimationActive={false}
              />
            )}
            {showMetric("memory") && (
              <Area
                type="monotone"
                dataKey="memory"
                name="Memory"
                stroke="#facc15"
                strokeWidth={2}
                fill="url(#memGrad)"
                isAnimationActive={false}
              />
            )}
            {showMetric("gpu") && (
              <Area
                type="monotone"
                dataKey="gpu"
                name="GPU"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#gpuGrad)"
                isAnimationActive={false}
              />
            )}
            {showMetric("storage") && (
              <Area
                type="monotone"
                dataKey="storage"
                name="Storage"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#storageGrad)"
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 pt-1.5 border-t border-border mt-1 shrink-0">
        {[
          { key: "cpu", label: "CPU", color: "#22d3ee" },
          { key: "memory", label: "Memory", color: "#facc15" },
          { key: "gpu", label: "GPU", color: "#a855f7" },
          { key: "storage", label: "Storage", color: "#22c55e" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(prev => prev === item.key ? "all" : item.key)}
            className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
              filter === "all" || filter === item.key ? 'opacity-100' : 'opacity-30'
            }`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-foreground">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
