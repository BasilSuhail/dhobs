"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Plus, RotateCcw, ShieldCheck, Database, Clock, FileJson, CheckCircle2, AlertCircle, Loader2, HardDrive, X } from "lucide-react"

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

export function BackupSection() {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [restoreLogs, setRestoreLogs] = useState<RestoreLogEntry[]>([])
  const [backingUp, setBackingUp] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>(['all'])
  const [includeMedia, setIncludeMedia] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'history' | 'restore-logs'>('history')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isVisibleRef = useRef(true)

  const availableServices = ['dashboard', 'jellyfin', 'nextcloud', 'mariadb', 'matrix', 'vaultwarden']

  const fetchBackups = useCallback(async () => {
    if (!isVisibleRef.current) return
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setBackups(data)
    } catch { /* silently fail */ }
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
    pollRef.current = setInterval(() => {
      fetchBackups()
      fetchRestoreLogs()
    }, 3000)
    return () => {
      isVisibleRef.current = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchBackups, fetchRestoreLogs])

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
    try {
      const servicesToBackup = selectedServices.includes('all') ? availableServices : selectedServices
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: servicesToBackup, includeMedia })
      })
      const data = await res.json()
      if (data.jobId || data.job_id) fetchBackups()
    } catch { /* silently fail */ }
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

  return (
    <div className="flex flex-col h-screen overflow-hidden pl-20 lg:pl-[88px]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground">Backup & Recovery</h2>
          <p className="text-[11px] text-foreground/40 mt-0.5 uppercase tracking-wider">System-wide Encrypted Snapshots</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-tight">Encryption Active</span>
           </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6 space-y-8">

        {/* Quick Action Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 bg-secondary/5 rounded-2xl border border-border p-4 lg:p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
              <Database className="w-48 h-48" />
            </div>

            <div className="relative z-10">
              <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Create New Snapshot
              </h3>
              <p className="text-xs text-foreground/50 mb-4 lg:mb-6 max-w-md leading-relaxed">
                Trigger a manual system-wide snapshot. Services will be briefly paused to ensure data consistency before encryption.
              </p>

              {/* Service Selection */}
              <div className="mb-4 lg:mb-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/40 mb-2">Services</p>
                <div className="flex flex-wrap gap-2">
                  {['all', ...availableServices].map(svc => {
                    const isSelected = svc === 'all' ? selectedServices.includes('all') : !selectedServices.includes('all') && selectedServices.includes(svc)
                    return (
                      <button
                        key={svc}
                        onClick={() => toggleService(svc)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-secondary/10 text-foreground/30 border border-border hover:border-emerald-500/20 hover:text-foreground/50'
                        }`}
                      >
                        {svc === 'all' ? 'All Services' : svc}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4 lg:mb-6 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl max-w-sm">
                <input
                  type="checkbox"
                  id="includeMedia"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-secondary/20 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="includeMedia" className="text-[11px] font-medium text-foreground/70 cursor-pointer select-none">
                  Include large media libraries (Jellyfin movies/shows)
                </label>
              </div>

              <button
                onClick={handleBackup}
                disabled={backingUp || backups.some(b => b.status === 'in_progress')}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-secondary/20 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
              >
                {backingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                {backingUp ? 'Capturing Snapshot...' : 'Run Full System Backup'}
              </button>
            </div>
          </div>

          {/* Status Info Card */}
          <div className="bg-secondary/5 rounded-2xl border border-border p-4 lg:p-6 flex flex-col justify-between">
             <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                   <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/40">Next Scheduled</span>
                   </div>
                   <span className="text-[11px] font-mono text-foreground/60">Daily @ 03:00</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                   <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-purple-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/40">Storage Limit</span>
                   </div>
                   <span className="text-[11px] font-mono text-foreground/60">No Limit (Local)</span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/40">Encryption</span>
                   </div>
                   <span className="text-[11px] font-mono text-foreground/60">AES-256-GCM</span>
                </div>
             </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-border">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'history' ? 'text-foreground' : 'text-foreground/30 hover:text-foreground/50'}`}
            >
              Snapshot History
              {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
            </button>
            <button
              onClick={() => setActiveTab('restore-logs')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'restore-logs' ? 'text-foreground' : 'text-foreground/30 hover:text-foreground/50'}`}
            >
              Restore Logs
              {activeTab === 'restore-logs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
            </button>
          </div>

          <div className="bg-secondary/5 rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-secondary/10 border-b border-border text-foreground/30 font-bold uppercase tracking-widest text-[10px]">
                  <th className="px-4 lg:px-6 py-4">Snapshot ID</th>
                  <th className="px-4 lg:px-6 py-4">Created At</th>
                  <th className="px-4 lg:px-6 py-4">Services</th>
                  <th className="px-4 lg:px-6 py-4">Size</th>
                  <th className="px-4 lg:px-6 py-4">Status</th>
                  <th className="px-4 lg:px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {/* Snapshot History Tab */}
                {activeTab === 'history' && backups.map((b) => (
                  <tr key={b.job_id} className="hover:bg-secondary/5 transition-colors group">
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-3.5 h-3.5 text-foreground/20 shrink-0" />
                        <span className="font-mono text-foreground/60 truncate">{b.job_id.substring(0, 12)}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-foreground/50 font-medium whitespace-nowrap">
                      {formatDate(b.created_at)}
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(() => {
                          try {
                            const svcs = JSON.parse(b.services)
                            return (
                              <>
                                {svcs.slice(0, 2).map((s: string) => (
                                  <span key={s} className="px-1.5 py-0.5 rounded bg-secondary/20 text-[9px] uppercase font-bold text-foreground/40">{s}</span>
                                ))}
                                {svcs.length > 2 && (
                                  <span className="px-1.5 py-0.5 rounded bg-secondary/20 text-[9px] uppercase font-bold text-foreground/40">+{svcs.length - 2}</span>
                                )}
                              </>
                            )
                          } catch {
                            return <span className="text-[9px] text-red-400/50 italic">—</span>
                          }
                        })()}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-foreground/40 font-mono whitespace-nowrap">
                      {humanSize(b.archive_size)}
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className={`flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider ${b.status === 'success' ? 'text-emerald-400' : b.status === 'restored' ? 'text-cyan-400' : b.status === 'in_progress' ? 'text-amber-400 animate-pulse' : 'text-red-400'}`}>
                        {b.status === 'in_progress' ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : b.status === 'success' ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : b.status === 'restored' ? <RotateCcw className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{b.status.replace('_', ' ')}</span>
                      </div>
                      {b.status === 'failed' && b.error && (
                        <span className="block mt-1 text-[9px] text-red-400/60 truncate max-w-[150px]" title={b.error}>{b.error}</span>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(b.status === 'success' || b.status === 'restored') && (
                          <button
                            onClick={() => setShowRestoreModal(b.job_id)}
                            className="px-3 py-1.5 rounded-lg bg-secondary/10 hover:bg-emerald-500/10 border border-border hover:border-emerald-500/20 text-[10px] font-bold text-foreground/40 hover:text-emerald-400 transition-all flex items-center gap-2 shrink-0"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        )}
                        <button
                          onClick={() => setShowDeleteModal(b.job_id)}
                          className="p-2 rounded-lg bg-secondary/10 hover:bg-rose-500/10 border border-border hover:border-rose-500/20 text-foreground/40 hover:text-rose-400 transition-all shrink-0"
                          title="Delete Backup"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Restore Logs Tab */}
                {activeTab === 'restore-logs' && restoreLogs.length > 0 && restoreLogs.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/5 transition-colors">
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5 text-cyan-400/40 shrink-0" />
                        <span className="font-mono text-foreground/60 truncate">{r.job_id.substring(0, 12)}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-foreground/50 font-medium whitespace-nowrap">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(() => {
                          try {
                            const svcs = JSON.parse(r.services)
                            return svcs.map((s: string) => (
                              <span key={s} className="px-1.5 py-0.5 rounded bg-secondary/20 text-[9px] uppercase font-bold text-foreground/40">{s}</span>
                            ))
                          } catch { return <span className="text-[9px] text-foreground/30">—</span> }
                        })()}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">—</td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className={`flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider ${r.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.status === 'success' ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
                        {r.status}
                      </div>
                      {r.error && <span className="block mt-1 text-[9px] text-red-400/60 truncate max-w-[150px]" title={r.error}>{r.error}</span>}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right text-foreground/30 text-[10px]">Completed</td>
                  </tr>
                ))}

                {/* Empty states */}
                {activeTab === 'history' && backups.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-foreground/20 italic text-sm">No snapshots found. Trigger your first backup above.</td></tr>
                )}
                {activeTab === 'restore-logs' && restoreLogs.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-foreground/20 italic text-sm">No restore operations performed yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl scale-in-95 animate-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
              <RotateCcw className="w-8 h-8 text-emerald-500" />
            </div>

            <h3 className="text-xl font-bold text-foreground mb-3">Restore this Backup?</h3>
            <p className="text-sm text-foreground/60 mb-6 leading-relaxed">
              Restoring snapshot <span className="font-mono text-emerald-400 bg-emerald-500/5 px-1 rounded">{showRestoreModal.substring(0, 8)}</span> will overwrite the current data for the affected services. This cannot be undone.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleRestore(showRestoreModal)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Yes, Restore Now
              </button>
              <button
                onClick={() => setShowRestoreModal(null)}
                className="w-full py-3 bg-secondary/10 hover:bg-secondary/20 text-foreground/60 hover:text-foreground rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl scale-in-95 animate-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>

            <h3 className="text-xl font-bold text-foreground mb-3">Delete this Backup?</h3>
            <p className="text-sm text-foreground/60 mb-6 leading-relaxed">
              You are about to permanently delete snapshot <span className="font-mono text-rose-400 bg-rose-500/5 px-1 rounded">{showDeleteModal.substring(0, 8)}</span>.
              This will remove the encrypted archive from disk and cannot be recovered.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-500/20 active:scale-95"
              >
                Yes, Delete Permanently
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="w-full py-3 bg-secondary/10 hover:bg-secondary/20 text-foreground/60 hover:text-foreground rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
