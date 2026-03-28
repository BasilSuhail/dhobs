"use client"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Cpu, MemoryStick, HardDrive, Wifi, Activity, Server, AlertTriangle, Clock } from "lucide-react"
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

// Mock data for charts
const cpuHistory = [
  { time: "00:00", value: 45 },
  { time: "04:00", value: 38 },
  { time: "08:00", value: 65 },
  { time: "12:00", value: 78 },
  { time: "16:00", value: 56 },
  { time: "20:00", value: 42 },
  { time: "Now", value: 52 },
]

const networkActivity = [
  { time: "00:00", upload: 120, download: 450 },
  { time: "04:00", upload: 80, download: 320 },
  { time: "08:00", upload: 250, download: 680 },
  { time: "12:00", upload: 180, download: 520 },
  { time: "16:00", upload: 320, download: 780 },
  { time: "20:00", upload: 150, download: 420 },
  { time: "Now", upload: 200, download: 550 },
]

const systemLoad = [
  { name: "1min", value: 1.15 },
  { name: "5min", value: 0.89 },
  { name: "15min", value: 0.72 },
]

const alerts = [
  { id: 1, type: "warning", message: "CPU_IOWAIT - 50.7%", time: "Tue Jan 4, 22 at 1:15 AM" },
  { id: 2, type: "warning", message: "MEMORY - 69.2%", time: "Thur Jan 6, 22 at 6:26 AM" },
]

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
    { name: "used", value: value },
    { name: "free", value: 100 - value },
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
          >
            <Cell fill={colorTheme.accent} />
            <Cell fill="rgba(255,255,255,0.1)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="text-3xl font-bold" style={{ color: colorTheme.accent }}>
          {value}%
        </span>
        <span className="text-xs text-foreground/50">CPU Usage</span>
      </div>
    </div>
  )
}

function MemoryGauge({ value }: { value: number }) {
  const { colorTheme } = useTheme()
  const data = [
    { name: "used", value: value },
    { name: "free", value: 100 - value },
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
          >
            <Cell fill="#22d3ee" />
            <Cell fill="rgba(255,255,255,0.1)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="text-3xl font-bold" style={{ color: "#22d3ee" }}>
          {value}%
        </span>
        <span className="text-xs text-foreground/50">Memory</span>
      </div>
    </div>
  )
}

export function DashboardSection() {
  const { colorTheme } = useTheme()

  return (
    <section className="min-h-screen px-8 py-16 pl-24">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <h2 
            className="text-3xl font-bold tracking-tight"
            style={{ color: colorTheme.foreground }}
          >
            System Monitor
          </h2>
          <p className="text-foreground/50 mt-1">Real-time resource usage monitoring</p>
        </header>

        {/* Quick Stats Bar */}
        <div 
          className="flex items-center gap-6 mb-8 px-5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4" style={{ color: colorTheme.accent }} />
            <span className="text-sm font-medium" style={{ color: colorTheme.foreground }}>4%</span>
            <span className="text-xs text-foreground/50">CPU</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <MemoryStick className="h-4 w-4" style={{ color: "#22d3ee" }} />
            <span className="text-sm font-medium" style={{ color: colorTheme.foreground }}>1.8 GiB</span>
            <span className="text-xs text-foreground/50">Free</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" style={{ color: "#a855f7" }} />
            <span className="text-sm font-medium" style={{ color: colorTheme.foreground }}>11 GB</span>
            <span className="text-xs text-foreground/50">Free</span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* CPU Usage Gauge */}
          <GlassCard title="CPU Usage" icon={Cpu}>
            <CpuGauge value={52} />
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/50">User</span>
                <span style={{ color: colorTheme.foreground }}>1.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/50">System</span>
                <span style={{ color: colorTheme.foreground }}>1.1%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/50">Idle</span>
                <span style={{ color: colorTheme.foreground }}>97.7%</span>
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
                <Area type="monotone" dataKey="value" stroke={colorTheme.accent} fill="url(#cpuGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Memory Gauge */}
          <GlassCard title="Memory Usage" icon={MemoryStick}>
            <MemoryGauge value={12.7} />
            <p className="text-center text-xs text-foreground/50 mt-2">Expand Details</p>
          </GlassCard>

          {/* Network Activity */}
          <GlassCard title="Network Activity" icon={Wifi} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={networkActivity}>
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
                <Area type="monotone" dataKey="download" stroke="#22d3ee" fill="url(#downloadGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="upload" stroke="#a855f7" fill="url(#uploadGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#22d3ee]" />
                <span className="text-xs text-foreground/50">Download</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#a855f7]" />
                <span className="text-xs text-foreground/50">Upload</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* System Load */}
          <GlassCard title="System Load" icon={Server}>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={systemLoad}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Bar dataKey="value" fill={colorTheme.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Disk Space */}
          <GlassCard title="Disk Space" icon={HardDrive}>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: colorTheme.foreground }}>/dev/root</span>
                  <span className="text-foreground/50">5.64 GB / 119.88 GB</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: "5%", backgroundColor: "#22c55e" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: colorTheme.foreground }}>/user/home</span>
                  <span className="text-foreground/50">914.56 GB / 1.82 TB</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: "50%", backgroundColor: "#facc15" }} />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* System Alerts */}
          <GlassCard title="System Alerts" icon={AlertTriangle}>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-foreground/40" />
                    <span className="text-[10px] text-foreground/40">{alert.time}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs" style={{ color: colorTheme.foreground }}>{alert.message}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium uppercase">
                    Warning
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Services Section */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: colorTheme.foreground }}>Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "pfSense", desc: "Firewall", status: "running", ping: "15ms" },
              { name: "Pi-hole", desc: "Network ad blocking", status: "running", ping: "12ms" },
              { name: "TrueNAS", desc: "NAS", status: "running", ping: "20ms" },
              { name: "Plex", desc: "Media", status: "running", ping: "60ms" },
              { name: "Portainer", desc: "Docker controller", status: "running", ping: "10ms" },
              { name: "Uptime Kuma", desc: "Uptime monitoring", status: "healthy", ping: "10ms" },
            ].map((service) => (
              <div 
                key={service.name}
                className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl"
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: colorTheme.foreground }}>{service.name}</p>
                  <p className="text-xs text-foreground/50">{service.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground/40">{service.ping}</span>
                  <span 
                    className="text-[10px] px-2 py-0.5 rounded font-medium uppercase"
                    style={{ 
                      backgroundColor: service.status === "running" || service.status === "healthy" 
                        ? "rgba(34, 197, 94, 0.2)" 
                        : "rgba(239, 68, 68, 0.2)",
                      color: service.status === "running" || service.status === "healthy" 
                        ? "#22c55e" 
                        : "#ef4444"
                    }}
                  >
                    {service.status}
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
