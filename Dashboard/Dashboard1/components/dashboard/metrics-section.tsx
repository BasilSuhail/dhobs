"use client"

import { useEffect, useState, useRef } from "react"
import { QuickStats } from "../metrics/quick-stats"
import { CpuGauge, MemoryGauge, GpuGauge, TemperatureGauge } from "../metrics/gauge-cards"
import { SystemChart } from "../metrics/system-chart"
import { NetworkActivity } from "../metrics/network-activity"
import { StorageLoad } from "../metrics/storage-load"
import { DiskVolumes } from "../metrics/disk-volumes"
import { NodeAlerts } from "../metrics/node-alerts"
import { ActiveInfrastructure } from "../metrics/active-infrastructure"
import { SystemDiagnostics } from "../metrics/system-diagnostics"

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
  topContainers: ContainerStat[]
  containers: ContainerStat[]
  gpu: { load: number; temp: number } | null
  temps: { cpu: number | null; gpu: number | null; sys: number | null }
  diskUsedPerc: number | null
  uptimeDays: number | null
  swap: { total: number; used: number; perc: number } | null
  loadAvg: { load1: number; load5: number; load15: number } | null
  netErrors: { rxErrors: number; txErrors: number; rxDropped: number; txDropped: number } | null
}

interface SystemHistoryPoint {
  time: string
  cpu: number
  memory: number
  gpu: number
  storage: number
}

interface NetworkHistoryPoint {
  time: string
  down: number
  up: number
}

export function MetricsSection() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [systemHistory, setSystemHistory] = useState<SystemHistoryPoint[]>([])
  const [networkHistory, setNetworkHistory] = useState<NetworkHistoryPoint[]>([])
  const isFetching = useRef(false)

  // Fetch persisted history on mount
  useEffect(() => {
    fetch('/api/stats/history')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSystemHistory(data.map((d: any) => ({
            time: d.time,
            cpu: d.cpu,
            memory: d.memory,
            gpu: d.gpu,
            storage: d.disk,
          })))
          setNetworkHistory(data.map((d: any) => ({
            time: d.time,
            down: parseFloat(d.netDown) || 0,
            up: parseFloat(d.netUp) || 0,
          })))
        }
      })
      .catch(() => { /* no history yet — first poll */ })
  }, [])

  const fetchStats = async () => {
    if (isFetching.current) return
    isFetching.current = true
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (data && !data.error) {
        setStats(data)
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

        const diskPerc = data.diskUsedPerc ?? 0

        setSystemHistory(prev => [...prev, {
          time: now,
          cpu: parseFloat(data.cpu) || 0,
          memory: parseFloat(data.memPerc) || 0,
          gpu: data?.gpu?.load ?? 0,
          storage: diskPerc,
        }].slice(-120))

        setNetworkHistory(prev => [...prev, {
          time: now,
          down: parseFloat(data.netDown) || 0,
          up: parseFloat(data.netUp) || 0,
        }].slice(-120))
      }
    } catch (err) {
      console.error("Metrics offline")
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
    <div className="flex flex-col gap-3 p-3 pl-[88px] h-[100vh] max-h-[100vh] overflow-hidden box-border">
      {/* Quick Stats Bar */}
      <QuickStats stats={stats} />

      {/* Row 1: Gauges + Performance Chart */}
      <div className="flex gap-3" style={{ flex: '0 0 28%' }}>
        <div className="grid grid-cols-2 grid-rows-2 gap-3" style={{ flex: '0 0 280px' }}>
          <CpuGauge value={parseFloat(stats?.cpu || "0")} containerCount={stats?.containers.length || 0} />
          <MemoryGauge value={parseFloat(stats?.memPerc || "0")} usedBytes={stats?.memBytes || "0"} />
          <GpuGauge gpu={stats?.gpu ?? null} />
          <TemperatureGauge temps={stats?.temps ?? { cpu: null, gpu: null, sys: null }} />
        </div>
        <div className="flex-1 min-w-0">
          <SystemChart data={systemHistory} />
        </div>
      </div>

      {/* Row 2: Storage, Disk Volumes, Node Alerts, Traffic Pulse */}
      <div className="flex gap-3" style={{ flex: '0 0 22%' }}>
        <div style={{ flex: '0 0 180px' }}>
          <StorageLoad stats={stats} />
        </div>
        <div style={{ flex: '0 0 160px' }}>
          <DiskVolumes stats={stats} />
        </div>
        <div style={{ flex: '0 0 210px' }}>
          <NodeAlerts stats={stats} />
        </div>
        <div className="flex-1 min-w-0">
          <NetworkActivity stats={stats} history={networkHistory} />
        </div>
      </div>

      {/* Row 3: Active Infrastructure — takes remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ActiveInfrastructure stats={stats} />
      </div>

      {/* Row 4: System Diagnostics — Swap, Load, Network Errors */}
      <SystemDiagnostics stats={stats} />
    </div>
  )
}
