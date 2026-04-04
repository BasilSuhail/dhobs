"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { BrainCircuit, RefreshCw, HardDrive, Trash2, Download, X, ChevronRight, Cpu } from "lucide-react"

interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

interface OllamaShowResponse {
  modelfile?: string
  parameters?: string
  template?: string
  details?: {
    parent_model?: string
    format?: string
    family?: string
    families?: string[]
    parameter_size?: string
    quantization_level?: string
  }
  model_info?: Record<string, unknown>
}

interface PullProgress {
  status: string
  total: number
  completed: number
  percent: number
  error?: string
}

interface OllamaSectionProps {
  isWindow?: boolean
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

// Normalize model names — "llama3.2:latest" and "llama3.2" both become "llama3.2"
function modelBase(name: string): string {
  return name.split(':')[0]
}

export function OllamaSection({ isWindow }: OllamaSectionProps) {
  const { colorTheme, mode } = useTheme()
  const [models, setModels] = useState<OllamaModel[]>([])
  const [healthy, setHealthy] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  // Running models (from /api/ps)
  const [runningModels, setRunningModels] = useState<Set<string>>(new Set())

  // Pull state
  const [pullInput, setPullInput] = useState('')
  const [isPulling, setIsPulling] = useState(false)
  const [pullProgress, setPullProgress] = useState<Record<string, PullProgress>>({})
  const abortRef = useRef<AbortController | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Details drawer
  const [drawerModel, setDrawerModel] = useState<string | null>(null)
  const [drawerData, setDrawerData] = useState<OllamaShowResponse | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  // Proxy through /api/ollama — never hits port 11434 directly from the browser.
  const fetchModels = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ollama')
      if (!res.ok) throw new Error('not ok')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setModels(data.models || [])
      setHealthy(true)
    } catch {
      setModels([])
      setHealthy(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  // Poll /api/ps every 5s to keep running-model state fresh
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/ollama/ps')
        if (!res.ok) return
        const data = await res.json()
        setRunningModels(new Set(
          (data.models || []).map((m: { name: string }) => modelBase(m.name))
        ))
      } catch { /* silently ignore */ }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [])

  // Remove terminal pull progress entries after a delay (success after 3s, error after 6s)
  useEffect(() => {
    const terminalKeys = Object.entries(pullProgress)
      .filter(([, v]) => v.status === 'success' || v.status === 'error')
      .map(([k, v]) => ({ k, delay: v.status === 'success' ? 3000 : 6000 }))
    if (terminalKeys.length === 0) return
    const timers = terminalKeys.map(({ k, delay }) =>
      setTimeout(() => {
        setPullProgress(prev => {
          const next = { ...prev }
          delete next[k]
          return next
        })
      }, delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [pullProgress])

  // Abort any in-progress pull on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const handlePull = async () => {
    const name = pullInput.trim()
    if (!name || isPulling) return

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setIsPulling(true)
    setPullProgress(prev => ({
      ...prev,
      [name]: { status: 'starting', total: 0, completed: 0, percent: 0 },
    }))

    try {
      const res = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
        signal: ctrl.signal,
      })
      if (!res.body) throw new Error('No stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let hadError = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line)
            const total = msg.total ?? 0
            const completed = msg.completed ?? 0
            // Treat Ollama-level errors (returned in the NDJSON) as failures
            const status = msg.error ? 'error' : (msg.status ?? 'pulling')
            if (status === 'error') hadError = true
            setPullProgress(prev => ({
              ...prev,
              [name]: { status, total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0, error: msg.error },
            }))
          } catch { /* malformed NDJSON chunk, skip */ }
        }
      }

      if (!hadError) {
        await fetchModels()
        setPullInput('')
        setPullProgress(prev => ({
          ...prev,
          [name]: { status: 'success', total: 1, completed: 1, percent: 100 },
        }))
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
      setPullProgress(prev => ({
        ...prev,
        [name]: { status: 'error', total: 0, completed: 0, percent: 0, error: String(e) },
      }))
    } finally {
      setIsPulling(false)
    }
  }

  const handleDelete = async (name: string) => {
    setDeleteConfirm(null)
    const snapshot = models
    setModels(prev => prev.filter(m => m.name !== name))
    try {
      const res = await fetch('/api/ollama/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Delete failed')
    } catch {
      setModels(snapshot) // rollback on error
    }
  }

  const handleOpenDrawer = async (name: string) => {
    setDrawerModel(name)
    setDrawerData(null)
    setDrawerLoading(true)
    try {
      const res = await fetch('/api/ollama/show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      setDrawerData(await res.json())
    } catch {
      setDrawerData(null)
    } finally {
      setDrawerLoading(false)
    }
  }

  const isRunning = (name: string) => runningModels.has(modelBase(name))

  const activePulls = Object.entries(pullProgress).filter(([, v]) => v.status !== 'success')

  const content = (
    <div
      className={cn(
        "flex-1 w-full overflow-hidden flex flex-col relative",
        !isWindow && "rounded-2xl border"
      )}
      style={!isWindow ? {
        borderColor: colorTheme.border,
        backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
        backdropFilter: 'blur(24px)',
      } : undefined}
    >
      {/* Header bar */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: colorTheme.border }}
      >
        {/* Title + health badge */}
        <div className="flex items-center gap-2 shrink-0">
          <BrainCircuit className="h-4 w-4" style={{ color: colorTheme.accent }} />
          <span className="text-sm font-semibold" style={{ color: colorTheme.foreground }}>Ollama</span>
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
            healthy === true && "bg-green-500/10 text-green-500",
            healthy === false && "bg-red-500/10 text-red-500",
            healthy === null && "bg-white/5 opacity-40"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              healthy === true && "bg-green-500 animate-pulse",
              healthy === false && "bg-red-500",
              healthy === null && "bg-current"
            )} />
            {healthy === true ? 'Online' : healthy === false ? 'Offline' : 'Checking'}
          </div>
        </div>

        {/* Pull input + button */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={pullInput}
            onChange={e => setPullInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePull()}
            placeholder="model:tag  e.g. llama3.2"
            disabled={isPulling}
            className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg border bg-transparent outline-none disabled:opacity-40"
            style={{ borderColor: colorTheme.border, color: colorTheme.foreground }}
          />
          <button
            onClick={handlePull}
            disabled={isPulling || !pullInput.trim()}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-30"
            style={{ backgroundColor: `${colorTheme.accent}20`, color: colorTheme.accent }}
          >
            <Download className={cn("h-3 w-3", isPulling && "animate-bounce")} />
            {isPulling ? 'Pulling…' : 'Pull'}
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={() => fetchModels()}
          disabled={loading}
          className="shrink-0 p-1.5 rounded-lg transition-opacity opacity-40 hover:opacity-100 disabled:opacity-20"
          style={{ color: colorTheme.foreground }}
          title="Refresh"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Active pull progress bars */}
      {activePulls.length > 0 && (
        <div
          className="shrink-0 px-4 py-2 space-y-2 border-b"
          style={{ borderColor: colorTheme.border }}
        >
          {activePulls.map(([name, progress]) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[10px] font-mono truncate max-w-[65%]"
                  style={{ color: colorTheme.foreground }}
                >
                  {name}
                </span>
                <span className="text-[10px] opacity-50" style={{ color: colorTheme.foreground }}>
                  {progress.error
                    ? 'Error'
                    : progress.total > 0
                      ? `${progress.percent}%`
                      : progress.status}
                </span>
              </div>
              <div
                className="h-1 w-full rounded-full overflow-hidden"
                style={{ backgroundColor: `${colorTheme.border}` }}
              >
                {progress.error ? (
                  <div className="h-full w-full rounded-full bg-red-500/60" />
                ) : progress.total === 0 ? (
                  // Indeterminate: manifest / verify phase
                  <div
                    className="h-full w-1/3 rounded-full animate-pulse"
                    style={{ backgroundColor: colorTheme.accent }}
                  />
                ) : (
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent}%`, backgroundColor: colorTheme.accent }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Model list */}
      <div className="flex-1 overflow-y-auto p-4">
        {healthy === false ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <BrainCircuit className="h-12 w-12 opacity-10" style={{ color: colorTheme.foreground }} />
            <div className="space-y-2">
              <p className="text-sm font-semibold" style={{ color: colorTheme.foreground }}>
                Ollama is not reachable
              </p>
              <p className="text-xs opacity-40 max-w-xs" style={{ color: colorTheme.foreground }}>
                Make sure the Ollama container is running. It should be accessible at{' '}
                <code className="font-mono">project-s-ollama:11434</code>.
              </p>
            </div>
          </div>
        ) : models.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <BrainCircuit className="h-12 w-12 opacity-10" style={{ color: colorTheme.foreground }} />
            <div className="space-y-2">
              <p className="text-sm font-semibold" style={{ color: colorTheme.foreground }}>
                No models pulled yet
              </p>
              <p className="text-xs opacity-40 max-w-xs" style={{ color: colorTheme.foreground }}>
                Type a model name above and click Pull — e.g.{' '}
                <code
                  className="font-mono px-1 py-0.5 rounded"
                  style={{ backgroundColor: `${colorTheme.accent}20`, color: colorTheme.accent }}
                >
                  llama3.2
                </code>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p
              className="text-xs font-bold uppercase tracking-wider opacity-40 mb-3"
              style={{ color: colorTheme.foreground }}
            >
              {models.length} {models.length === 1 ? 'model' : 'models'} available
            </p>
            {models.map(model => (
              <div key={model.name}>
                <div
                  className="group flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer"
                  style={{
                    borderColor: colorTheme.border,
                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  }}
                  onClick={() => {
                    if (deleteConfirm === model.name) return
                    handleOpenDrawer(model.name)
                  }}
                >
                  {/* Icon + name + running badge */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${colorTheme.accent}15` }}
                    >
                      <BrainCircuit className="h-4 w-4" style={{ color: colorTheme.accent }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate" style={{ color: colorTheme.foreground }}>
                          {model.name}
                        </p>
                        {isRunning(model.name) && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-green-500/15 text-green-500 shrink-0">
                            <Cpu className="h-2.5 w-2.5" />
                            Loaded
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] opacity-40" style={{ color: colorTheme.foreground }}>
                        {new Date(model.modified_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Size + delete + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 opacity-40" style={{ color: colorTheme.foreground }}>
                      <HardDrive className="h-3 w-3" />
                      <span className="text-xs">{formatSize(model.size)}</span>
                    </div>

                    {deleteConfirm === model.name ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(model.name)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold opacity-50 hover:opacity-100 transition-opacity"
                          style={{ color: colorTheme.foreground }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(model.name) }}
                        className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity p-1 rounded"
                        style={{ color: colorTheme.foreground }}
                        title="Delete model"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <ChevronRight className="h-3.5 w-3.5 opacity-20" style={{ color: colorTheme.foreground }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer backdrop */}
      {drawerModel && (
        <div
          className="absolute inset-0 z-10"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          onClick={() => setDrawerModel(null)}
        />
      )}

      {/* Details drawer */}
      <div
        className={cn(
          "absolute top-0 right-0 bottom-0 w-72 z-20 flex flex-col border-l",
          "transition-transform duration-300 ease-in-out",
          drawerModel ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          backgroundColor: mode === 'dark' ? 'rgba(10,10,10,0.92)' : 'rgba(250,250,250,0.95)',
          borderColor: colorTheme.border,
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Drawer header */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: colorTheme.border }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <BrainCircuit className="h-4 w-4 shrink-0" style={{ color: colorTheme.accent }} />
            <span className="text-sm font-semibold truncate" style={{ color: colorTheme.foreground }}>
              {drawerModel}
            </span>
          </div>
          <button
            onClick={() => setDrawerModel(null)}
            className="shrink-0 p-1 rounded opacity-40 hover:opacity-100 transition-opacity"
            style={{ color: colorTheme.foreground }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {drawerLoading ? (
            <div className="flex items-center justify-center h-24">
              <RefreshCw className="h-5 w-5 animate-spin opacity-30" style={{ color: colorTheme.foreground }} />
            </div>
          ) : drawerData ? (
            <>
              {drawerData.details && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-40" style={{ color: colorTheme.foreground }}>
                    Details
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {drawerData.details.parameter_size && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: `${colorTheme.accent}20`, color: colorTheme.accent }}
                      >
                        {drawerData.details.parameter_size}
                      </span>
                    )}
                    {drawerData.details.quantization_level && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: `${colorTheme.accent}15`, color: colorTheme.accent }}
                      >
                        {drawerData.details.quantization_level}
                      </span>
                    )}
                    {drawerData.details.family && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold opacity-60"
                        style={{ backgroundColor: colorTheme.border, color: colorTheme.foreground }}
                      >
                        {drawerData.details.family}
                      </span>
                    )}
                    {drawerData.details.format && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold opacity-60"
                        style={{ backgroundColor: colorTheme.border, color: colorTheme.foreground }}
                      >
                        {drawerData.details.format}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {drawerData.parameters && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-40" style={{ color: colorTheme.foreground }}>
                    Parameters
                  </p>
                  <pre
                    className="text-[10px] font-mono p-2 rounded-lg overflow-x-auto max-h-28 overflow-y-auto"
                    style={{
                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      color: colorTheme.foreground,
                    }}
                  >
                    {drawerData.parameters}
                  </pre>
                </div>
              )}

              {drawerData.template && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-40" style={{ color: colorTheme.foreground }}>
                    Template
                  </p>
                  <pre
                    className="text-[10px] font-mono p-2 rounded-lg overflow-x-auto max-h-32 overflow-y-auto"
                    style={{
                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      color: colorTheme.foreground,
                    }}
                  >
                    {drawerData.template}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs opacity-40 text-center pt-8" style={{ color: colorTheme.foreground }}>
              Could not load model details.
            </p>
          )}
        </div>

        {/* Drawer footer — delete */}
        {drawerModel && !drawerLoading && (
          <div className="shrink-0 px-4 py-3 border-t" style={{ borderColor: colorTheme.border }}>
            {deleteConfirm === drawerModel ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { handleDelete(drawerModel); setDrawerModel(null) }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: colorTheme.foreground, backgroundColor: colorTheme.border }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(drawerModel)}
                className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold opacity-40 hover:opacity-80 transition-opacity"
                style={{ color: colorTheme.foreground }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete model
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (isWindow) {
    return <div className="w-full h-full flex flex-col">{content}</div>
  }

  return (
    <section className="h-screen w-full pl-20 pt-4 pb-4 pr-4 overflow-hidden flex flex-col">
      {content}
    </section>
  )
}
