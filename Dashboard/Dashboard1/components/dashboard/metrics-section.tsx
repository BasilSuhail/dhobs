"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Activity, ChevronDown, ArrowUpRight, ArrowDownRight, MoreHorizontal, Plus, Download, RotateCcw, ServerOff, ChevronRight } from "lucide-react"
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Line, LineChart } from "recharts"

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
  disks: Array<{ mount: string; total: string; used: string; avail: string; usePerc: number; device: string }>
  smart: Array<{ device: string; model: string; temperature: number | null; powerOnHours: number | null; health: string; reallocated: number | null }>
  power: { watts: number | null; kwhEstimate: number | null }
  backup: { lastRun: number | null; lastRunAgo: string | null; success: boolean | null; size: string | null }
  ups: { batteryPerc: number | null; loadPerc: number | null; runtimeMin: number | null; status: string | null }
  platform: string
  agentConnected: boolean
  metricsSource: string
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
  if (["running", "healthy"].includes(status)) return "Running"
  if (status === "unhealthy") return "Unhealthy"
  if (status === "exited") return "Exited"
  if (status === "dead") return "Dead"
  if (status === "restarting") return "Restarting"
  if (status === "paused") return "Paused"
  return "Running"
}

// ── Sparkline ──────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 40
    const y = 12 - (v / 100) * 12
    return `${x},${y}`
  }).join(" ")
  return (
    <svg width="40" height="14" className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">{title}</h3>
      {action}
    </div>
  )
}

// ── Backup + UPS Row ───────────────────────────────────────────────────────

interface BackupEntry {
  job_id: string
  archive_size: number
  created_at: number
  status: string
  services: string
  error?: string
}

function BackupWidget() {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [backingUp, setBackingUp] = useState(false)
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null)
  const [showRestoreModal, setShowRestoreModal] = useState<string | null>(null)
  const [selectedServices, setSelectedServices] = useState<string[]>(['all'])
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const availableServices = ['dashboard', 'jellyfin', 'nextcloud', 'mariadb', 'matrix', 'vaultwarden']

  const fetchBackups = useCallback(() => {
    fetch('/api/backup')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setBackups(data.slice(0, 5))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchBackups()
    pollRef.current = setInterval(fetchBackups, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchBackups])

  const handleBackup = async () => {
    setBackingUp(true)
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: availableServices })
      })
      const data = await res.json()
      if (data.job_id || data.jobId) {
        fetchBackups()
      }
    } catch { /* silent fail */ }
    finally { setBackingUp(false) }
  }

  const handleRestore = async (jobId: string) => {
    setShowRestoreModal(null)
    setRestoreMsg(`Restore initiated: ${(jobId || '').substring(0, 8)}`)
    try {
      // we assume all services in the backup should be restored, or maybe just the ones backed up
      const backup = backups.find(b => b.job_id === jobId)
      let services: string[] = []
      try {
        services = backup ? JSON.parse(backup.services) : []
      } catch (e) {
        console.error('Failed to parse services', e)
      }
      await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, services }),
      })
    } catch { /* silent fail */ }
  }

  const toggleService = (svc: string) => {
    if (svc === 'all') {
      setSelectedServices(['all'])
      return
    }
    const next = selectedServices.filter(s => s !== 'all')
    if (next.includes(svc)) {
      const filtered = next.filter(s => s !== svc)
      setSelectedServices(filtered.length === 0 ? ['all'] : filtered)
    } else {
      setSelectedServices([...next, svc])
    }
  }

  const humanSize = (bytes: number) => {
    if (!bytes) return '0 KB'
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts * 1000) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div>
      <SectionHeader title="Backup" action={
        <div className="flex items-center gap-2">
          <div className="relative group z-10">
            <button className="text-[9px] text-foreground/50 border border-border px-1.5 py-0.5 rounded">
              {selectedServices.includes('all') ? 'All Services' : `${selectedServices.length} Selected`}
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-card border border-border rounded shadow-lg p-2 min-w-[120px]">
              <div className="flex items-center gap-2 mb-1">
                <input type="checkbox" checked={selectedServices.includes('all')} onChange={() => toggleService('all')} />
                <span className="text-[10px]">All Services</span>
              </div>
              <hr className="border-border my-1" />
              {availableServices.map(s => (
                <div key={s} className="flex items-center gap-2 mb-1">
                  <input type="checkbox" checked={!selectedServices.includes('all') && selectedServices.includes(s)} onChange={() => toggleService(s)} />
                  <span className="text-[10px] capitalize">{s}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleBackup}
            disabled={backingUp || backups.some(b => b.status === 'in_progress')}
            className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
          >
            <Plus className="w-2.5 h-2.5" />
            {backingUp ? 'Creating...' : 'New'}
          </button>
        </div>
      } />
      <div className="bg-secondary/5 rounded-lg p-2.5">
        {backups.length > 0 ? (
          <div className="space-y-1.5">
            {backups.map((b) => (
              <div key={b.job_id || Math.random()} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.status === 'success' ? 'bg-emerald-400' : b.status === 'restored' ? 'bg-cyan-400' : b.status === 'in_progress' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-foreground/50 truncate font-mono" title={b.job_id}>{(b.job_id || '').substring(0, 8)}</span>
                  <span className="text-foreground/25 shrink-0">{humanSize(b.archive_size / (1024 * 1024))}</span>
                  {b.error && <span className="text-red-400 text-[8px] truncate max-w-[60px]" title={b.error}>{b.error}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-foreground/20">{timeAgo(b.created_at)}</span>
                  {(b.status === 'success' || b.status === 'restored') && (
                    <button
                      onClick={() => setShowRestoreModal(b.job_id)}
                      className="p-0.5 rounded hover:bg-secondary/30 transition-colors"
                      title="Restore"
                    >
                      <RotateCcw className="w-3 h-3 text-foreground/25 hover:text-cyan-400 transition-colors" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-foreground/20 text-center py-3">
            No backups yet. Click "New" to create one.
          </div>
        )}
        {restoreMsg && <div className="text-[9px] text-cyan-400 mt-1.5">{restoreMsg}</div>}
      </div>

      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-4 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-rose-500 mb-2">Confirm Restore</h3>
            <p className="text-[11px] text-foreground/70 mb-4 leading-relaxed">
              This will stop the associated services, replace their data with the selected backup, and restart them. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRestoreModal(null)}
                className="px-3 py-1.5 text-[11px] font-medium text-foreground/60 hover:text-foreground bg-secondary/10 hover:bg-secondary/20 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(showRestoreModal)}
                className="px-3 py-1.5 text-[11px] font-medium text-white bg-rose-500 hover:bg-rose-600 rounded transition-colors"
              >
                Yes, Restore Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Section ───────────────────────────────────────────────────────────

export function MetricsSection() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [range, setRange] = useState<TimeRange>("1h")
  const [rangeOpen, setRangeOpen] = useState(false)
  const [cpuHistory, setCpuHistory] = useState<number[]>([])
  const [memHistory, setMemHistory] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedContainer, setExpandedContainer] = useState<string | null>(null)
  const isFetching = useRef(false)
  const rangeRef = useRef<HTMLDivElement>(null)

  // Close range dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) setRangeOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

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
          setCpuHistory(data.map((d: any) => d.cpu ?? 0).slice(-30))
          setMemHistory(data.map((d: any) => d.memory ?? 0).slice(-30))
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
        setLoading(false)
        const diskPerc = data.diskUsedPerc ?? 0
        setCpuHistory(prev => [...prev, parseFloat(data.cpu) || 0].slice(-30))
        setMemHistory(prev => [...prev, parseFloat(data.memPerc) || 0].slice(-30))
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setHistory(prev => [...prev, {
          time: now,
          cpu: parseFloat(data.cpu) || 0,
          memory: parseFloat(data.memPerc) || 0,
          gpu: data?.gpu?.load ?? 0,
          disk: diskPerc,
          netDown: parseFloat(data.netDown) || 0,
          netUp: parseFloat(data.netUp) || 0,
        }].slice(-1344))
      }
    } catch { console.error("Metrics offline") }
    finally { isFetching.current = false }
  }, [])

  useEffect(() => { fetchHistory(range) }, [range, fetchHistory])
  useEffect(() => { fetchStats(); const i = setInterval(fetchStats, 5000); return () => clearInterval(i) }, [fetchStats])

  const rangeLabels: Record<TimeRange, string> = { "1h": "Past hour", "6h": "Past 6 hours", "24h": "Past 24 hours", "7d": "Past 7 days" }

  // ── Render ─────────────────────────────────────────────────────────────

  if (!stats) {
    return (
      <div className="flex flex-col h-screen overflow-hidden pl-[88px]">
        <div className="flex items-center justify-center h-full text-foreground/20">
          <span className="text-xs font-medium animate-pulse">Loading metrics...</span>
        </div>
      </div>
    )
  }

  const chartTooltip = {
    contentStyle: { backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px", padding: "6px 10px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" },
    labelStyle: { color: "var(--foreground)", opacity: 0.4, marginBottom: "2px" },
    itemStyle: { color: "var(--foreground)", padding: "1px 0" },
  }

  const gridStroke = "rgba(128,128,128,0.06)"
  const axisTick = { fill: "rgba(128,128,128,0.25)", fontSize: 9 }

  return (
    <div className="flex flex-col h-screen overflow-hidden pl-[88px]">

      {/* Header bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 shrink-0 border-b border-border">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Metrics</h2>
            <p className="text-[10px] text-foreground/25 mt-0.5">Real-time · 5s refresh</p>
          </div>
          {/* Platform badge */}
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border ${
            stats.platform === 'linux' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            stats.platform === 'darwin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
            stats.platform === 'win32' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
            'bg-secondary/10 text-foreground/30 border-border'
          }`}>
            {stats.platform === 'darwin' ? 'macOS' : stats.platform === 'win32' ? 'Windows' : stats.platform}
          </span>
          {/* Agent status */}
          {stats.agentConnected && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" title="Host agent providing metrics">
              Agent Connected
            </span>
          )}
        </div>
        <div className="relative" ref={rangeRef}>
          <button onClick={() => setRangeOpen(!rangeOpen)} className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-foreground/50 bg-secondary/10 rounded-md border border-border hover:bg-secondary/20 transition-colors">
            {range} · {rangeLabels[range]}
            <ChevronDown className={`w-3 h-3 transition-transform ${rangeOpen ? "rotate-180" : ""}`} />
          </button>
          {rangeOpen && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden min-w-[160px]">
              {(["1h", "6h", "24h", "7d"] as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => { setRange(r); setRangeOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${range === r ? 'text-foreground bg-secondary/10 font-medium' : 'text-foreground/40 hover:text-foreground/60'}`}
                >
                  {r} <span className="opacity-40 ml-1">— {rangeLabels[r]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 space-y-4">

        {/* Stat pills */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {loading ? (
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-baseline gap-1.5">
                  <div className="h-2.5 w-8 sm:w-10 rounded bg-secondary/20 animate-pulse" />
                  <div className="h-4 sm:h-5 w-10 sm:w-12 rounded bg-secondary/20 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2">
              <div className="flex items-baseline gap-1.5" title="Total CPU usage across all containers">
                <span className="text-[10px] text-foreground/30 uppercase tracking-wider">CPU</span>
                <span className="text-base font-mono font-semibold text-foreground tabular-nums">{stats?.cpu ?? "0"}%</span>
                <Sparkline data={cpuHistory} color="#0ea5e9" />
              </div>
              <span className="text-foreground/10">|</span>
              <div className="flex items-baseline gap-1.5" title="Memory usage and total GiB consumed">
                <span className="text-[10px] text-foreground/30 uppercase tracking-wider">Memory</span>
                <span className="text-base font-mono font-semibold text-foreground tabular-nums">{stats?.memPerc ?? "0"}%</span>
                <span className="text-[10px] text-foreground/25">{stats?.memBytes ?? "0"} GiB</span>
                <Sparkline data={memHistory} color="#8b5cf6" />
              </div>
              <span className="text-foreground/10">|</span>
              <div className="flex items-baseline gap-1.5" title="Root filesystem disk usage">
                <span className="text-[10px] text-foreground/30 uppercase tracking-wider">Disk</span>
                <span className="text-base font-mono font-semibold text-foreground tabular-nums">{stats?.diskUsedPerc ?? "—"}%</span>
              </div>
              <span className="text-foreground/10">|</span>
              <div className="flex items-baseline gap-1.5" title="System uptime in days since last reboot">
                <span className="text-[10px] text-foreground/30 uppercase tracking-wider">Uptime</span>
                <span className="text-base font-mono font-semibold text-foreground tabular-nums">{stats?.uptimeDays ?? "—"}d</span>
              </div>
              <span className="text-foreground/10">|</span>
              <div className="flex items-baseline gap-1.5" title="Network throughput — download and upload MB/s">
                <span className="text-[10px] text-foreground/30 uppercase tracking-wider">Net</span>
                <span className="text-[11px] font-mono text-emerald-500 tabular-nums">↓{stats?.netDown ?? "0"}</span>
                <span className="text-[11px] font-mono text-rose-400 tabular-nums">↑{stats?.netUp ?? "0"}</span>
                <span className="text-[9px] text-foreground/20">MB/s</span>
              </div>
            </div>
          )}
        </div>

        {/* Left column: CPU chart, Network chart, System, Backup */}
        {/* Right column: Storage, Disk Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,6.5fr)_minmax(0,3.5fr)] gap-3 sm:gap-4">
          {/* Left column */}
          <div className="space-y-4">
            {/* CPU & Memory */}
            <div>
              <SectionHeader title="CPU & Memory" />
              <div className="h-32 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="1 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={axisTick} interval="preserveStartEnd" minTickGap={80} />
                    <YAxis axisLine={false} tickLine={false} tick={axisTick} domain={[0, 100]} ticks={[0, 50, 100]} />
                    <Tooltip {...chartTooltip} formatter={(v: number, n: string) => [`${v.toFixed(1)}%`, n === "cpu" ? "CPU" : "Memory"]} />
                    <Area type="monotone" dataKey="cpu" name="cpu" stroke="#0ea5e9" strokeWidth={1.5} fill="url(#cpuGrad)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="memory" name="memory" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#memGrad)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Network I/O */}
            <div>
              <SectionHeader title="Network I/O" />
              <div className="h-32 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ulGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="1 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={axisTick} interval="preserveStartEnd" minTickGap={80} />
                    <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                    <Tooltip {...chartTooltip} formatter={(v: number, n: string) => [`${v.toFixed(1)} MB`, n === "netDown" ? "Download" : "Upload"]} />
                    <Area type="monotone" dataKey="netDown" name="netDown" stroke="#06b6d4" strokeWidth={1.5} fill="url(#dlGrad)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="netUp" name="netUp" stroke="#f43f5e" strokeWidth={1.5} fill="url(#ulGrad)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Diagnostics */}
            <div>
              <SectionHeader title="System" />
              <div className="bg-secondary/5 rounded-lg px-3 py-2.5">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <div className="text-[9px] text-foreground/25 uppercase tracking-wider">Swap</div>
                    <div className="text-sm font-mono font-semibold text-foreground tabular-nums mt-0.5">{stats.swap ? `${stats.swap.perc.toFixed(0)}%` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-foreground/25 uppercase tracking-wider">Load</div>
                    <div className="text-sm font-mono font-semibold text-foreground tabular-nums mt-0.5">{stats.loadAvg ? stats.loadAvg.load1.toFixed(2) : "—"}</div>
                    {stats.loadAvg && <div className="text-[9px] text-foreground/15 tabular-nums">{stats.loadAvg.load5} · {stats.loadAvg.load15}</div>}
                  </div>
                  <div>
                    <div className="text-[9px] text-foreground/25 uppercase tracking-wider">CPU Temp</div>
                    <div className="text-sm font-mono font-semibold text-foreground tabular-nums mt-0.5">{stats.temps?.cpu ? `${stats.temps.cpu}°` : "—"}</div>
                    {stats.gpu?.temp && <div className="text-[9px] text-foreground/15 tabular-nums">GPU {stats.gpu.temp}°</div>}
                  </div>
                  <div>
                    <div className="text-[9px] text-foreground/25 uppercase tracking-wider">Net Health</div>
                    <div className="text-sm font-mono font-semibold tabular-nums mt-0.5" style={{ color: (stats.netErrors && (stats.netErrors.rxErrors + stats.netErrors.txDropped) > 0) ? "#ef4444" : "#22c55e" }}>
                      {stats.netErrors ? (stats.netErrors.rxErrors + stats.netErrors.txErrors + stats.netErrors.rxDropped + stats.netErrors.txDropped) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Backup */}
            <BackupWidget />
          </div>

          {/* Right column: Storage + Disk Usage */}
          <div className="space-y-4">
            {/* Storage */}
            <div>
              <SectionHeader title="Storage" />
              <div className="bg-secondary/5 rounded-lg p-3">
                <div className="space-y-2">
                  {stats.storage.map((s, i) => {
                    const total = stats.storage.reduce((sum, x) => sum + x.bytes, 0)
                    const pct = total > 0 ? ((s.bytes / total) * 100).toFixed(1) : "0"
                    const colors = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#22c55e", "#ec4899", "#06b6d4"]
                    return (
                      <div key={s.name} className="group">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-foreground/50 group-hover:text-foreground/70 transition-colors">{s.name}</span>
                          <span className="text-foreground/25 tabular-nums">{humanSize(parseFloat(s.size))}</span>
                        </div>
                        <div className="h-1.5 bg-secondary/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(1, Math.min(100, parseFloat(pct)))}%`, backgroundColor: colors[i % colors.length] }} />
                        </div>
                      </div>
                    )
                  })}
                  {stats.storage.length === 0 && <div className="text-[11px] text-foreground/20 py-4">No storage data</div>}
                </div>
              </div>
            </div>

            {/* Disk Usage */}
            {stats.disks && stats.disks.length > 0 && (
              <div>
                <SectionHeader title="Disk Usage" />
                <div className="bg-secondary/5 rounded-lg overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="text-left py-1.5 px-2 font-medium text-foreground/20 uppercase tracking-wider">Mount</th>
                        <th className="text-right py-1.5 px-2 font-medium text-foreground/20">Used</th>
                        <th className="text-right py-1.5 px-2 font-medium text-foreground/20">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.disks.map((d, i) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-secondary/5 transition-colors">
                          <td className="py-1.5 px-2 text-foreground/50 truncate max-w-[120px]" title={d.mount}>{d.mount}</td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-foreground/40">{d.used}/{d.total}</td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums" style={{ color: d.usePerc > 85 ? '#ef4444' : d.usePerc > 60 ? '#f59e0b' : '#22c55e' }}>{d.usePerc}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* UPS Status */}
            {stats?.ups?.batteryPerc !== null && stats && (
              <div>
                <SectionHeader title="UPS" />
                <div className="bg-secondary/5 rounded-lg p-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-[9px] text-foreground/25 uppercase tracking-wider">Battery</div>
                      <div className="text-base font-mono font-semibold text-foreground tabular-nums mt-0.5">{stats.ups.batteryPerc}%</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-foreground/25 uppercase tracking-wider">Load</div>
                      <div className="text-base font-mono font-semibold text-foreground tabular-nums mt-0.5">{stats.ups.loadPerc ? `${stats.ups.loadPerc}%` : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-foreground/25 uppercase tracking-wider">Runtime</div>
                      <div className="text-base font-mono font-semibold text-foreground tabular-nums mt-0.5">{stats.ups.runtimeMin ? `${stats.ups.runtimeMin.toFixed(0)}m` : "—"}</div>
                    </div>
                  </div>
                  {stats.ups.status && (
                    <div className="mt-1">
                      <span className="text-[9px] font-medium" style={{ color: stats.ups.status === 'OL' ? '#22c55e' : '#f59e0b' }}>
                        {stats.ups.status === 'OL' ? 'Online' : stats.ups.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Containers table */}
        <div>
          <SectionHeader title={`Containers (${stats.containers.length})`} />
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 px-2 font-medium text-foreground/20 uppercase tracking-wider text-[9px] w-4"></th>
                  <th className="text-left py-1.5 px-2 font-medium text-foreground/20 uppercase tracking-wider text-[9px]">Service</th>
                  <th className="text-left py-1.5 px-2 font-medium text-foreground/20 uppercase tracking-wider text-[9px]">Status</th>
                  <th className="text-right py-1.5 px-2 font-medium text-foreground/20 uppercase tracking-wider text-[9px]">CPU</th>
                  <th className="text-right py-1.5 px-2 font-medium text-foreground/20 uppercase tracking-wider text-[9px]">Memory</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {stats.containers.length > 0 ? stats.containers.map(c => (
                  <>
                    <tr
                      key={c.name}
                      className={`border-b border-border/40 hover:bg-secondary/5 transition-colors group cursor-pointer ${expandedContainer === c.name ? 'bg-secondary/5' : ''}`}
                      title={`${c.name} — Status: ${statusLabel(c.status)}, CPU: ${c.cpu}, Memory: ${c.mem.split(" / ")[0]}`}
                      onClick={() => setExpandedContainer(expandedContainer === c.name ? null : c.name)}
                    >
                      <td className="py-1.5 px-2 text-foreground/20">
                        <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expandedContainer === c.name ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="py-1.5 px-2 font-medium text-foreground/70 capitalize">{c.name}</td>
                      <td className="py-1.5 px-2">
                        <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: `${statusColor(c.status)}12`, color: statusColor(c.status) }}>
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor(c.status) }} />
                          {statusLabel(c.status)}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono tabular-nums text-foreground/40">{c.cpu}</td>
                      <td className="py-1.5 px-2 text-right font-mono tabular-nums text-foreground/40">{c.mem.split(" / ")[0]}</td>
                      <td className="py-1.5 px-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-3 h-3 text-foreground/30 ml-auto" />
                      </td>
                    </tr>
                    {expandedContainer === c.name && (
                      <tr className="bg-secondary/5">
                        <td colSpan={6} className="px-2 pb-2">
                          <div className="ml-6 text-[10px] text-foreground/50 grid grid-cols-2 gap-x-4 gap-y-1 py-1">
                            <span>Full Memory: <span className="font-mono text-foreground/70">{c.mem}</span></span>
                            <span>Net I/O: <span className="font-mono text-foreground/70">{String(c.netIO || "N/A")}</span></span>
                            <span>Block I/O: <span className="font-mono text-foreground/70">{String(c.blockIO || "N/A")}</span></span>
                            <span>PIDs: <span className="font-mono text-foreground/70">{String(c.pids || "N/A")}</span></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-3">
                          <ServerOff className="w-8 h-8 text-foreground/15" />
                        </div>
                        <p className="text-[11px] font-medium text-foreground/30">No containers running</p>
                        <p className="text-[10px] text-foreground/20 mt-0.5">Start services via docker-compose to see them here</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
