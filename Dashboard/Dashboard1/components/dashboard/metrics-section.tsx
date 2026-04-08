"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Cpu, MemoryStick, HardDrive, Clock, ArrowDownUp, Activity, AlertCircle, Wifi, Server, Database, Thermometer, Gauge } from "lucide-react"
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Line, LineChart, Bar, BarChart } from "recharts"

// ── Types ──────────────────────────────────────────────────────────────────

interface ContainerStat {
  name: string
  status: string
  cpu: string
  mem: string
  [key: string]: unknown
}

interface StorageStat {
  name: string
  size: string
  bytes: number
}

interface StatsData {
  cpu: string
  memPerc: string
  memBytes: string
  netDown: string
  netUp: string
  storage: StorageStat[]
  containers: ContainerStat[]
  gpu: { load: number; temp: number } | null
  temps: { cpu: number | null; gpu: number | null; sys: number | null }
  diskUsedPerc: number | null
  uptimeDays: number | null
  swap: { total: number; used: number; perc: number } | null
  loadAvg: { load1: number; load5: number; load15: number } | null
  netErrors: { rxErrors: number; txErrors: number; rxDropped: number; txDropped: number } | null
}

interface HistoryPoint {
  time: string
  cpu: number
  memory: number
  gpu: number
  disk: number
  netDown: number
  netUp: number
}

type TimeRange = "1h" | "6h" | "24h" | "7d"

// ── Helpers ────────────────────────────────────────────────────────────────

function humanBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function humanSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb.toFixed(0)} MB`
}

function statusColor(status: string): string {
  if (["running", "healthy"].includes(status)) return "#22c55e"
  if (["unhealthy", "exited", "dead"].includes(status)) return "#ef4444"
  if (["restarting", "paused"].includes(status)) return "#f59e0b"
  return "#22c55e"
}

function statusLabel(status: string): string {
  if (["running", "healthy"].includes(status)) return "OK"
  if (status === "unhealthy") return "Alert"
  if (status === "exited") return "Down"
  if (status === "dead") return "Dead"
  if (status === "restarting") return "Restarting"
  if (status === "paused") return "Paused"
  return "OK"
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold text-gray-900 tabular-nums leading-tight mt-0.5">{value}</div>
        {sub && <div className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  )
}

// ── Chart Card ─────────────────────────────────────────────────────────────

function ChartCard({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="h-52">
        {children}
      </div>
    </div>
  )
}

// ── Main Section ───────────────────────────────────────────────────────────

export function MetricsSection() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [range, setRange] = useState<TimeRange>("1h")
  const isFetching = useRef(false)

  const rangeToLimit: Record<TimeRange, number> = { "1h": 120, "6h": 360, "24h": 576, "7d": 1344 }

  const fetchHistory = useCallback((r: TimeRange) => {
    fetch(`/api/stats/history?range=${r}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHistory(data.map((d: any) => ({
            time: d.time,
            cpu: d.cpu ?? 0,
            memory: d.memory ?? 0,
            gpu: d.gpu ?? 0,
            disk: d.disk ?? 0,
            netDown: parseFloat(d.netDown) || 0,
            netUp: parseFloat(d.netUp) || 0,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const fetchStats = useCallback(async () => {
    if (isFetching.current) return
    isFetching.current = true
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (data && !data.error) {
        setStats(data)
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const diskPerc = data.diskUsedPerc ?? 0
        setHistory(prev => [...prev, {
          time: now,
          cpu: parseFloat(data.cpu) || 0,
          memory: parseFloat(data.memPerc) || 0,
          gpu: data?.gpu?.load ?? 0,
          disk: diskPerc,
          netDown: parseFloat(data.netDown) || 0,
          netUp: parseFloat(data.netUp) || 0,
        }].slice(-rangeToLimit[range]))
      }
    } catch { console.error("Metrics offline") }
    finally { isFetching.current = false }
  }, [range])

  useEffect(() => { fetchHistory(range) }, [range, fetchHistory])
  useEffect(() => { fetchStats(); const i = setInterval(fetchStats, 5000); return () => clearInterval(i) }, [fetchStats])

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">System Metrics</h1>
          <p className="text-xs text-gray-400 mt-0.5">Real-time monitoring · 5s refresh</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["1h", "6h", "24h", "7d"] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${range === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* Row 1: Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Cpu} label="CPU" value={`${stats?.cpu || "0"}%`} color="#0ea5e9" />
          <StatCard icon={MemoryStick} label="Memory" value={`${stats?.memPerc || "0"}%`} sub={`${stats?.memBytes || "0"} GiB used`} color="#8b5cf6" />
          <StatCard icon={HardDrive} label="Disk" value={stats?.diskUsedPerc ? `${stats.diskUsedPerc}%` : "N/A"} color="#f59e0b" />
          <StatCard icon={Clock} label="Uptime" value={stats?.uptimeDays ? `${stats.uptimeDays}d` : "N/A"} color="#22c55e" />
          <StatCard icon={Wifi} label="Net ↓" value={`${stats?.netDown || "0"} MB/s`} color="#06b6d4" />
          <StatCard icon={ArrowDownUp} label="Net ↑" value={`${stats?.netUp || "0"} MB/s`} color="#ec4899" />
        </div>

        {/* Row 2: Main Chart */}
        <ChartCard title="CPU & Memory History" icon={Activity}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} interval="preserveStartEnd" minTickGap={60} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} domain={[0, 100]} ticks={[0, 50, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} labelStyle={{ color: "#6b7280" }} formatter={(v: number, n: string) => [`${v.toFixed(1)}%`, n === "cpu" ? "CPU" : "Memory"]} />
              <Area type="monotone" dataKey="cpu" name="cpu" stroke="#0ea5e9" strokeWidth={2} fill="url(#cpuGrad)" isAnimationActive={false} />
              <Area type="monotone" dataKey="memory" name="memory" stroke="#8b5cf6" strokeWidth={2} fill="url(#memGrad)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 3: Network + Storage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Network Activity" icon={Wifi}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ulGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} interval="preserveStartEnd" minTickGap={60} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} labelStyle={{ color: "#6b7280" }} formatter={(v: number, n: string) => [`${v.toFixed(1)} MB`, n === "netDown" ? "Download" : "Upload"]} />
                <Area type="monotone" dataKey="netDown" name="netDown" stroke="#06b6d4" strokeWidth={2} fill="url(#dlGrad)" isAnimationActive={false} />
                <Area type="monotone" dataKey="netUp" name="netUp" stroke="#ec4899" strokeWidth={2} fill="url(#ulGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Storage Breakdown" icon={Database}>
            <div className="space-y-3 h-full overflow-y-auto pr-1">
              {stats?.storage?.map((s, i) => {
                const total = stats.storage.reduce((sum, x) => sum + x.bytes, 0)
                const pct = total > 0 ? ((s.bytes / total) * 100).toFixed(1) : "0"
                const colors = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#22c55e", "#ec4899", "#06b6d4"]
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-600">{s.name}</span>
                      <span className="text-gray-400">{humanSize(parseFloat(s.size))} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(2, Math.min(100, parseFloat(pct)))}%`, backgroundColor: colors[i % colors.length] }} />
                    </div>
                  </div>
                )
              }) ?? <div className="text-xs text-gray-400 text-center py-8">No storage data</div>}
            </div>
          </ChartCard>
        </div>

        {/* Row 4: Diagnostics + Containers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Diagnostics */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Diagnostics</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider">Swap</div>
                <div className="text-lg font-bold text-gray-900 tabular-nums">{stats?.swap ? `${stats.swap.perc.toFixed(0)}%` : "N/A"}</div>
                {stats?.swap && <div className="text-[11px] text-gray-400">{humanBytes(stats.swap.used)} / {humanBytes(stats.swap.total)}</div>}
              </div>
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider">Load Average</div>
                <div className="text-lg font-bold text-gray-900 tabular-nums">{stats?.loadAvg ? stats.loadAvg.load1.toFixed(2) : "N/A"}</div>
                {stats?.loadAvg && <div className="text-[11px] text-gray-400">{stats.loadAvg.load5.toFixed(2)} · {stats.loadAvg.load15.toFixed(2)}</div>}
              </div>
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider">Temperature</div>
                <div className="text-lg font-bold text-gray-900 tabular-nums">{stats?.temps?.cpu ? `${stats.temps.cpu}°C` : "N/A"}</div>
                <div className="text-[11px] text-gray-400">
                  {stats?.gpu?.temp ? `GPU ${stats.gpu.temp}°C · ` : ""}{stats?.temps?.sys ? `SYS ${stats.temps.sys}°C` : ""}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider">Network Health</div>
                <div className="text-lg font-bold tabular-nums" style={{ color: (stats?.netErrors && (stats.netErrors.rxErrors + stats.netErrors.txDropped) > 0) ? "#ef4444" : "#22c55e" }}>
                  {stats?.netErrors ? (stats.netErrors.rxErrors + stats.netErrors.txErrors + stats.netErrors.rxDropped + stats.netErrors.txDropped) : "—"}
                </div>
                <div className="text-[11px] text-gray-400">Errors + dropped packets</div>
              </div>
            </div>
          </div>

          {/* Containers */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Containers ({stats?.containers?.length || 0})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 font-medium text-gray-400 uppercase tracking-wider">Service</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-400 uppercase tracking-wider">CPU</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-400 uppercase tracking-wider">Memory</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.containers?.map(c => (
                    <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2 px-2 font-semibold text-gray-800 capitalize">{c.name}</td>
                      <td className="py-2 px-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: `${statusColor(c.status)}15`, color: statusColor(c.status) }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor(c.status) }} />
                          {statusLabel(c.status)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-600">{c.cpu}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-600">{c.mem.split(" / ")[0]}</td>
                    </tr>
                  )) ?? <tr><td colSpan={4} className="py-8 text-center text-gray-400">No containers</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
