"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Plus, RotateCcw, ShieldCheck, Database, Clock, FileJson, CheckCircle2, AlertCircle, Loader2, HardDrive, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface BackupEntry {
  job_id: string
  archive_size: number
  created_at: number
  status: string
  services: string
  error?: string
}

interface RestoreLogEntry {
  id: number
  job_id: string
  services: string
  status: string
  created_at: number
  error?: string
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">{title}</h3>
      {action}
    </div>
  )
}

export function BackupSection() {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [restoreLogs, setRestoreLogs] = useState<RestoreLogEntry[]>([])
  const [backingUp, setBackingUp] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedServices, setSelectedServices] = useState<string[]>(['all'])
  const [includeMedia, setIncludeMedia] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'history' | 'restore-logs'>('history')
  const [progress, setProgress] = useState(0)
  const [diskUsage, setDiskUsage] = useState<number | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const isVisibleRef = useRef(true)

  const availableServices = ['dashboard', 'jellyfin', 'nextcloud', 'mariadb', 'matrix', 'vaultwarden']

  const fetchStats = useCallback(async () => {
    if (!isVisibleRef.current) return
    try {
      const res = await fetch('/api/stats')
      if (!res.ok) return
      const data = await res.json()
      if (data.diskUsedPerc !== undefined) setDiskUsage(data.diskUsedPerc)
    } catch { /* ignore */ }
  }, [])

  const startProgress = () => {
    setProgress(5)
    if (progressInterval.current) clearInterval(progressInterval.current)
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95
        const inc = prev < 30 ? 2 : prev < 70 ? 1 : 0.5
        return prev + inc
      })
    }, 800)
  }

  const fetchBackups = useCallback(async () => {
    if (!isVisibleRef.current) return
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setBackups(data)
    } catch { /* silently fail */ }
    finally { setIsLoading(false) }
  }, [])

  const fetchRestoreLogs = useCallback(async () => {
    if (!isVisibleRef.current) return
    try {
      const res = await fetch('/api/backup/restore-logs')
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setRestoreLogs(data)
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => {
    fetchBackups()
    fetchRestoreLogs()
    fetchStats()
    pollRef.current = setInterval(() => {
      fetchBackups()
      fetchRestoreLogs()
      fetchStats()
    }, 5000)
    return () => {
      isVisibleRef.current = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchBackups, fetchRestoreLogs, fetchStats])

  // Pause polling when tab is not visible
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const handleBackup = async () => {
    setBackingUp(true)
    startProgress()
    try {
      const servicesToBackup = selectedServices.includes('all') ? availableServices : selectedServices
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: servicesToBackup, includeMedia })
      })
      const data = await res.json()
      if (data.jobId || data.job_id) fetchBackups()
      
      if (progressInterval.current) clearInterval(progressInterval.current)
      setProgress(100)
      setTimeout(() => setProgress(0), 1000)
    } catch { 
      if (progressInterval.current) clearInterval(progressInterval.current)
      setProgress(0)
    }
    finally { setBackingUp(false) }
  }

  const handleRestore = async (jobId: string) => {
    setShowRestoreModal(null)
    try {
      const backup = backups.find(b => b.job_id === jobId)
      let services: string[] = []
      try { services = backup ? JSON.parse(backup.services) : [] } catch { /* ignore */ }
      await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, services }),
      })
      fetchRestoreLogs()
    } catch { /* silently fail */ }
  }

  const handleDelete = async (jobId: string) => {
    setShowDeleteModal(null)
    try { await fetch(`/api/backup/${jobId}`, { method: 'DELETE' }) } catch { /* ignore */ }
    fetchBackups()
  }

  const toggleService = (svc: string) => {
    if (svc === 'all') { setSelectedServices(['all']); return }
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
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  const formatDate = (ts: number) => {
    return new Date(ts * 1000).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts * 1000) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const totalBackupSize = backups.reduce((sum, b) => sum + (b.archive_size || 0), 0)
  const lastSuccess = backups.find(b => b.status === 'success' || b.status === 'restored')

  return (
    <div className="flex flex-col h-screen overflow-hidden pl-[88px]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 shrink-0 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Backup & Recovery</h2>
          <p className="text-[10px] text-foreground/25 mt-0.5">Real-time · 5s refresh</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight">Encrypted</span>
           </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 space-y-4">

        {/* Stat pills row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {isLoading ? (
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-baseline gap-1.5">
                  <div className="h-2.5 w-8 sm:w-10 rounded bg-secondary/20 animate-pulse" />
                  <div className="h-4 sm:h-5 w-10 sm:w-12 rounded bg-secondary/20 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2">
              <div className="flex items-baseline gap-1.5" title="Total size of all encrypted snapshots">
                <span className="text-[10px] text-foreground/30 uppercase tracking-wider">Total Storage</span>
                <span className="text-base font-mono font-semibold text-foreground tabular-nums">{humanSize(totalBackupSize)}</span>
              </div>
              <span className="text-foreground/10">|</span>
              <div className="flex items-baseline gap-1.5" title="Time since last successful backup">
                <span className="text-[10px] text-foreground/30 uppercase tracking-wider">Last Run</span>
                <span className="text-base font-mono font-semibold text-foreground tabular-nums">{lastSuccess ? timeAgo(lastSuccess.created_at) : '—'}</span>
              </div>
              <span className="text-foreground/10">|</span>
              <div className="flex items-baseline gap-1.5" title="Snapshot count">
                <span className="text-[10px] text-foreground/30 uppercase tracking-wider">Snapshots</span>
                <span className="text-base font-mono font-semibold text-foreground tabular-nums">{backups.length}</span>
              </div>
              <span className="text-foreground/10">|</span>
              <div className="flex items-baseline gap-1.5" title="Host root filesystem usage">
                <span className="text-[10px] text-foreground/30 uppercase tracking-wider">Disk</span>
                <span className={`text-base font-mono font-semibold tabular-nums ${diskUsage && diskUsage > 90 ? 'text-rose-400' : 'text-foreground'}`}>
                  {diskUsage ?? "—"}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Card & Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,6.5fr)_minmax(0,3.5fr)] gap-3 sm:gap-4">
          
          {/* Create Snapshot Card */}
          <div className="space-y-4">
            <div>
              <SectionHeader title="Create New Snapshot" />
              <div className="bg-secondary/5 rounded-lg p-3 relative overflow-hidden group border border-border/50">
                <div className="absolute -right-4 -top-4 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity">
                  <Database className="w-32 h-32" />
                </div>
                
                <div className="relative z-10 space-y-4">
                  <p className="text-[11px] text-foreground/50 max-w-md leading-relaxed">
                    Trigger a manual system-wide snapshot. Services will be briefly paused to ensure data consistency.
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/30">Target Services</span>
                      <button 
                        onClick={() => toggleService('all')}
                        className="text-[9px] text-emerald-400/60 hover:text-emerald-400 font-bold uppercase"
                      >
                        {selectedServices.includes('all') ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['dashboard', 'jellyfin', 'nextcloud', 'mariadb', 'matrix', 'vaultwarden'].map(svc => {
                        const isSelected = selectedServices.includes('all') || selectedServices.includes(svc)
                        return (
                          <button
                            key={svc}
                            onClick={() => toggleService(svc)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border transition-all ${
                              isSelected
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-secondary/10 text-foreground/30 border-border hover:border-emerald-500/10'
                            }`}
                          >
                            {svc}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/10 border border-border/50 max-w-fit">
                    <input
                      type="checkbox"
                      id="includeMedia"
                      checked={includeMedia}
                      onChange={(e) => setIncludeMedia(e.target.checked)}
                      className="w-3 h-3 rounded border-border bg-card text-emerald-500 focus:ring-emerald-500"
                    />
                    <label htmlFor="includeMedia" className="text-[10px] font-medium text-foreground/50 cursor-pointer select-none">
                      Include Media Libraries
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleBackup}
                      disabled={backingUp || backups.some(b => b.status === 'in_progress')}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-400 border border-emerald-500/20 rounded-md font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95"
                    >
                      {backingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      {backingUp ? 'Capturing...' : 'Start Backup'}
                    </button>
                  </div>

                  {/* Dual-State Progress Bar */}
                  {backingUp && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-500">
                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                        <span className="text-emerald-400/80 flex items-center gap-1.5">
                          {progress < 25 ? 'Preparing...' : 'Compressing & Encrypting...'}
                        </span>
                        <span className="text-foreground/30 font-mono">{Math.floor(progress)}%</span>
                      </div>
                      <div className="h-1 w-full bg-secondary/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-700 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column: System Stats */}
          <div className="space-y-4">
            <div>
              <SectionHeader title="System Status" />
              <div className="bg-secondary/5 rounded-lg p-3 space-y-3 border border-border/50">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                   <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-cyan-400/60" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Next Job</span>
                   </div>
                   {isLoading ? <Skeleton className="h-3 w-16" /> : <span className="text-[10px] font-mono text-foreground/60">Daily 03:00</span>}
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className={`w-3.5 h-3.5 ${diskUsage && diskUsage > 90 ? 'text-rose-400' : 'text-purple-400/60'}`} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Disk Health</span>
                    </div>
                    {isLoading ? <Skeleton className="h-3 w-8" /> : <span className="text-[10px] font-mono text-foreground/60">{diskUsage ?? '--'}%</span>}
                  </div>
                  <div className="h-1 w-full bg-secondary/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${diskUsage && diskUsage > 90 ? 'bg-rose-500' : diskUsage && diskUsage > 70 ? 'bg-amber-500' : 'bg-purple-500'}`}
                      style={{ width: `${diskUsage ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                   <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400/60" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Cipher</span>
                   </div>
                   <span className="text-[10px] font-mono text-foreground/60">AES-256-GCM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History & Logs (Bottom) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-4 border-b border-border">
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 text-[11px] font-bold uppercase tracking-widest transition-all relative ${activeTab === 'history' ? 'text-foreground' : 'text-foreground/30 hover:text-foreground/50'}`}
            >
              Snapshot History
              {activeTab === 'history' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-emerald-500" />}
            </button>
            <button
              onClick={() => setActiveTab('restore-logs')}
              className={`pb-2 text-[11px] font-bold uppercase tracking-widest transition-all relative ${activeTab === 'restore-logs' ? 'text-foreground' : 'text-foreground/30 hover:text-foreground/50'}`}
            >
              Restore Logs
              {activeTab === 'restore-logs' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-emerald-500" />}
            </button>
          </div>

          <div className="bg-secondary/5 rounded-lg border border-border/50 overflow-hidden">
            {/* Empty State */}
            {!isLoading && backups.length === 0 && activeTab === 'history' && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <Database className="w-6 h-6 text-foreground/10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">No Snapshots</h3>
                  <p className="text-[10px] text-foreground/30 max-w-[200px]">System ready for initial backup.</p>
                </div>
              </div>
            )}

            {/* Desktop Table View */}
            <table className={`hidden md:table w-full text-[11px] text-left ${(!isLoading && backups.length === 0 && activeTab === 'history') ? 'opacity-0 h-0' : ''}`}>
              <thead>
                <tr className="border-b border-border text-foreground/20 uppercase tracking-wider text-[9px] font-medium">
                  <th className="px-4 py-2 w-4"></th>
                  <th className="px-2 py-2">Snapshot ID</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Services</th>
                  <th className="px-2 py-2">Size</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2"><div className="w-1 h-1 rounded-full bg-secondary/20" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-3 w-24" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-3 w-32" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-3 w-12" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-3 w-16" /></td>
                      <td className="px-4 py-2 text-right"><Skeleton className="h-6 w-16 ml-auto rounded" /></td>
                    </tr>
                  ))
                ) : (
                  <>
                    {/* Snapshot History Tab */}
                    {activeTab === 'history' && backups.map((b) => (
                      <tr key={b.job_id} className="hover:bg-secondary/5 transition-colors group">
                        <td className="px-4 py-2">
                          <span className={`w-1.5 h-1.5 rounded-full block ${b.status === 'success' ? 'bg-emerald-400' : b.status === 'restored' ? 'bg-cyan-400' : b.status === 'in_progress' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                        </td>
                        <td className="px-2 py-2 font-mono text-foreground/60">{b.job_id.substring(0, 12)}</td>
                        <td className="px-2 py-2 text-foreground/40 whitespace-nowrap">{formatDate(b.created_at)}</td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {(() => {
                              try {
                                const svcs = JSON.parse(b.services)
                                return svcs.slice(0, 3).map((s: string) => (
                                  <span key={s} className="px-1 py-0 rounded bg-secondary/10 text-[8px] uppercase font-bold text-foreground/30 border border-border/50">{s}</span>
                                ))
                              } catch { return '—' }
                            })()}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-foreground/40 font-mono text-[10px] whitespace-nowrap">{humanSize(b.archive_size)}</td>
                        <td className="px-2 py-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${b.status === 'success' ? 'text-emerald-400 bg-emerald-400/10' : b.status === 'in_progress' ? 'text-amber-400 bg-amber-400/10' : 'text-red-400 bg-red-400/10'}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(b.status === 'success' || b.status === 'restored') && (
                              <button onClick={() => setShowRestoreModal(b.job_id)} className="p-1.5 rounded hover:bg-emerald-500/10 text-foreground/30 hover:text-emerald-400" title="Restore"><RotateCcw className="w-3.5 h-3.5" /></button>
                            )}
                            <button onClick={() => setShowDeleteModal(b.job_id)} className="p-1.5 rounded hover:bg-rose-500/10 text-foreground/30 hover:text-rose-400" title="Delete"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Restore Logs Tab */}
                    {activeTab === 'restore-logs' && restoreLogs.map((r) => (
                      <tr key={r.id} className="hover:bg-secondary/5 transition-colors group">
                        <td className="px-4 py-2"><span className={`w-1.5 h-1.5 rounded-full block ${r.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} /></td>
                        <td className="px-2 py-2 font-mono text-foreground/60">{r.job_id.substring(0, 12)}</td>
                        <td className="px-2 py-2 text-foreground/40 whitespace-nowrap">{formatDate(r.created_at)}</td>
                        <td className="px-2 py-2" colSpan={2}>
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              try {
                                const svcs = JSON.parse(r.services)
                                return svcs.map((s: string) => <span key={s} className="px-1 py-0 rounded bg-secondary/10 text-[8px] uppercase font-bold text-foreground/30">{s}</span>)
                              } catch { return '—' }
                            })()}
                          </div>
                        </td>
                        <td className="px-2 py-2 uppercase text-[9px] font-bold text-foreground/40">{r.status}</td>
                        <td className="px-4 py-2 text-right text-[10px] text-foreground/20">Done</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>

            {/* Mobile View - reusing same logic but matching Metrics card style */}
            <div className="md:hidden divide-y divide-border/40">
              {backups.map(b => (
                <div key={b.job_id} className="p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-foreground/60">{b.job_id.substring(0, 8)}</span>
                    <span className={`text-[9px] font-bold uppercase ${b.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{b.status}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-foreground/30">
                    <span>{formatDate(b.created_at)}</span>
                    <span>{humanSize(b.archive_size)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals - Matching Metrics "Done" style */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">Confirm Restore</h3>
            <p className="text-[11px] text-foreground/50 mb-6 leading-relaxed">Overwrite current service data with snapshot <span className="text-emerald-400 font-mono">{showRestoreModal.substring(0,8)}</span>?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowRestoreModal(null)} className="flex-1 py-2 bg-secondary/10 hover:bg-secondary/20 text-foreground/60 rounded font-bold text-[10px] uppercase tracking-widest transition-all">Cancel</button>
              <button onClick={() => handleRestore(showRestoreModal)} className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold text-[10px] uppercase tracking-widest transition-all">Yes, Restore</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-2">Delete Snapshot</h3>
            <p className="text-[11px] text-foreground/50 mb-6 leading-relaxed">Permanently remove snapshot <span className="text-rose-400 font-mono">{showDeleteModal.substring(0,8)}</span> from disk?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-2 bg-secondary/10 hover:bg-secondary/20 text-foreground/60 rounded font-bold text-[10px] uppercase tracking-widest transition-all">Cancel</button>
              <button onClick={() => handleDelete(showDeleteModal)} className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded font-bold text-[10px] uppercase tracking-widest transition-all">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
