"use client"

import { useEffect, useState, useRef } from "react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Cpu, MemoryStick, HardDrive, Wifi, Activity, Server, AlertTriangle, Clock, Database, Terminal } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"

interface ContainerStat {
  name: string
  status: string
  cpu: string
  mem: string
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
  topContainers: ContainerStat[]
  containers: ContainerStat[]
}

interface HistoryPoint {
  time: string
  value: number
  upload?: number
  download?: number
}

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  title?: string
  icon?: React.ElementType
}

function GlassCard({ children, className, title, icon: Icon }: GlassCardProps) {
  const { colorTheme } = useTheme()
  
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5",
        "backdrop-blur-xl",
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon className="h-4 w-4" style={{ color: colorTheme.accent }} />}
          <h3 className="text-sm font-semibold" style={{ color: colorTheme.foreground }}>
            {title}
          </h3>
        </div>
      )}
      {children}
    </div>
  )
}

function CpuGauge({ value }: { value: number }) {
  const { colorTheme } = useTheme()
  const data = [
    { name: "used", value: value || 0.1 },
    { name: "free", value: Math.max(0.1, 100 - value) },
  ]

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={colorTheme.accent} />
            <Cell fill="rgba(255,255,255,0.1)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="text-3xl font-bold" style={{ color: colorTheme.accent }}>
          {value.toFixed(1)}%
        </span>
        <span className="text-xs text-foreground/50">CPU Usage</span>
      </div>
    </div>
  )
}

function MemoryGauge({ value }: { value: number }) {
  const { colorTheme } = useTheme()
  const data = [
    { name: "used", value: value || 0.1 },
    { name: "free", value: Math.max(0.1, 100 - value) },
  ]

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="#22d3ee" />
            <Cell fill="rgba(255,255,255,0.1)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="text-3xl font-bold" style={{ color: "#22d3ee" }}>
          {value.toFixed(1)}%
        </span>
        <span className="text-xs text-foreground/50">Memory</span>
      </div>
    </div>
  )
}

const STORAGE_COLORS = ['#d4e157', '#22d3ee', '#a855f7', '#fb923c', '#ec4899'];

import { MOCK_STATS } from "@/lib/landing-data"

interface DashboardSectionProps {
  onExecContainer?: (containerName: string) => void
}

export function DashboardSection({ onExecContainer }: DashboardSectionProps) {
  const IS_LANDING = process.env.NEXT_PUBLIC_LANDING_MODE === 'true'
  const { colorTheme } = useTheme()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [cpuHistory, setCpuHistory] = useState<HistoryPoint[]>([])
  const [netHistory, setNetHistory] = useState<HistoryPoint[]>([])
  const isFetching = useRef(false)

  const fetchStats = async () => {
    if (IS_LANDING) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setStats(MOCK_STATS)
      setCpuHistory(prev => [...prev, { time: now, value: parseFloat(MOCK_STATS.cpu) }].slice(-15))
      setNetHistory(prev => [...prev, { time: now, value: 0, upload: parseFloat(MOCK_STATS.netUp), download: parseFloat(MOCK_STATS.netDown) }].slice(-15))
      return
    }
    if (isFetching.current) return
    isFetching.current = true
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (data && !data.error) {
        setStats(data)
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setCpuHistory(prev => [...prev, { time: now, value: parseFloat(data.cpu) }].slice(-15))
        setNetHistory(prev => [...prev, { time: now, value: 0, upload: parseFloat(data.netUp), download: parseFloat(data.netDown) }].slice(-15))
      }
    } catch (err) {
      console.error("Stats fetch failed")
    } finally {
      isFetching.current = false
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="min-h-screen px-8 py-16 pl-24 transition-colors duration-500 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: colorTheme.foreground }}>System Monitor</h2>
            <p className="text-foreground/50 mt-1">Real-time resource usage monitoring</p>
          </div>
          {stats && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-500 uppercase">Live</span>
            </div>
          )}
        </header>

        {/* Quick Stats Bar */}
        <div 
          className="flex items-center gap-6 mb-8 px-5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4" style={{ color: colorTheme.accent }} />
            <span className="text-sm font-medium" style={{ color: colorTheme.foreground }}>{stats?.cpu || "0"}%</span>
            <span className="text-xs text-foreground/50">CPU</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <MemoryStick className="h-4 w-4" style={{ color: "#22d3ee" }} />
            <span className="text-sm font-medium" style={{ color: colorTheme.foreground }}>{stats?.memBytes || "0"} GiB</span>
            <span className="text-xs text-foreground/50">Used</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4" style={{ color: "#34d399" }} />
            <span className="text-sm font-medium" style={{ color: colorTheme.foreground }}>{stats?.netDown || "0"} MB/s</span>
            <span className="text-xs text-foreground/50">Net In</span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* CPU Usage Gauge */}
          <GlassCard title="CPU Usage" icon={Cpu}>
            <CpuGauge value={parseFloat(stats?.cpu || "0")} />
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/50">Containers</span>
                <span style={{ color: colorTheme.foreground }}>{stats?.containers.length || 0} active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/50">Sync Status</span>
                <span style={{ color: colorTheme.foreground }}>Connected</span>
              </div>
            </div>
          </GlassCard>

          {/* CPU History Chart */}
          <GlassCard title="CPU History" icon={Activity} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cpuHistory}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorTheme.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colorTheme.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Area type="monotone" dataKey="value" stroke={colorTheme.accent} fill="url(#cpuGradient)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Memory Gauge */}
          <GlassCard title="Memory Usage" icon={MemoryStick}>
            <MemoryGauge value={parseFloat(stats?.memPerc || "0")} />
            <p className="text-center text-xs text-foreground/50 mt-2">{stats?.memBytes || "0"} GiB Allocated</p>
          </GlassCard>

          {/* Network Activity */}
          <GlassCard title="Network Activity" icon={Wifi} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={netHistory}>
                <defs>
                  <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Area type="monotone" dataKey="download" stroke="#22d3ee" fill="url(#downloadGradient)" strokeWidth={2} isAnimationActive={false} />
                <Area type="monotone" dataKey="upload" stroke="#a855f7" fill="url(#uploadGradient)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#22d3ee]" />
                <span className="text-xs text-foreground/50">Down: {stats?.netDown}MB</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#a855f7]" />
                <span className="text-xs text-foreground/50">Up: {stats?.netUp}MB</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Storage Load */}
          <GlassCard title="Storage Load" icon={Database}>
            <div className="space-y-3 py-2">
              {stats?.storage.map((s, i) => (
                <div key={s.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold opacity-40">
                    <span style={{ color: colorTheme.foreground }}>{s.name}</span>
                    <span>{s.size} MB</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-700" 
                      style={{ 
                        width: `${Math.min(100, (s.bytes/10000000)*100)}%`, 
                        backgroundColor: STORAGE_COLORS[i % STORAGE_COLORS.length] 
                      }} 
                    />
                  </div>
                </div>
              ))}
              {(!stats || stats.storage.length === 0) && (
                <div className="text-[10px] opacity-20 uppercase font-black text-center py-4">Scanning Volumes...</div>
              )}
            </div>
          </GlassCard>

          {/* Disk Space - Repurposed for Project Data */}
          <GlassCard title="Disk Volumes" icon={HardDrive}>
            <div className="space-y-4 py-2">
              {stats?.storage.slice(0, 2).map((s, i) => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: colorTheme.foreground }}>{s.name}</span>
                    <span className="text-foreground/50">{s.size} MB</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ 
                        width: `${Math.min(100, (s.bytes/50000000)*100)}%`, 
                        backgroundColor: i === 0 ? "#22c55e" : "#facc15" 
                      }} 
                    />
                  </div>
                </div>
              ))}
              {(!stats || stats.storage.length === 0) && (
                <div className="text-[10px] opacity-20 uppercase font-black text-center py-4">Mapping Data...</div>
              )}
            </div>
          </GlassCard>

          {/* System Alerts */}
          <GlassCard title="Node Alerts" icon={AlertTriangle}>
            <div className="space-y-3">
              {(stats?.containers || []).slice(0, 3).map((c) => (
                <div key={c.name} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <Server className="h-3 w-3 text-foreground/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold truncate block" style={{ color: colorTheme.foreground }}>{c.name.toUpperCase()}</span>
                    <p className="text-[9px] opacity-40">CPU: {c.cpu} | MEM: {c.mem.split(' / ')[0]}</p>
                  </div>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 font-bold uppercase shrink-0">
                    Up
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Services Section */}
        <div className="mt-8 pb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: colorTheme.foreground }}>Active Infrastructure</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(stats?.containers || []).map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl transition-all"
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: colorTheme.foreground }}>{service.name}</p>
                  <p className="text-[10px] text-foreground/50 uppercase tracking-tighter">Docker Container</p>
                </div>
                <div className="flex items-center gap-2">
                  {onExecContainer && (
                    <button
                      onClick={() => onExecContainer(`project-s-${service.name}`)}
                      className="flex items-center justify-center h-6 w-6 rounded transition-all opacity-30 hover:opacity-100"
                      style={{ color: colorTheme.foreground }}
                      title={`Open terminal in ${service.name}`}
                    >
                      <Terminal className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-green-500/20 text-green-500">
                    Running
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
