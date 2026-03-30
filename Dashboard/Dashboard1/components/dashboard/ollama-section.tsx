"use client"

import { useState, useEffect, useCallback } from "react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { BrainCircuit, RefreshCw, HardDrive } from "lucide-react"

interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

interface OllamaSectionProps {
  isWindow?: boolean
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function OllamaSection({ isWindow }: OllamaSectionProps) {
  const { colorTheme, mode } = useTheme()
  const [ollamaUrl, setOllamaUrl] = useState("")
  const [models, setModels] = useState<OllamaModel[]>([])
  const [healthy, setHealthy] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchModels = useCallback(async (baseUrl: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/tags`)
      if (!res.ok) throw new Error('not ok')
      const data = await res.json()
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
    const base = `http://${window.location.hostname}:11434`
    setOllamaUrl(base)
    fetchModels(base)
  }, [fetchModels])

  const content = (
    <div
      className={cn(
        "flex-1 w-full overflow-hidden flex flex-col",
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
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b"
        style={{ borderColor: colorTheme.border }}
      >
        <div className="flex items-center gap-2">
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
        <button
          onClick={() => ollamaUrl && fetchModels(ollamaUrl)}
          disabled={loading}
          className="p-1.5 rounded-lg transition-opacity opacity-40 hover:opacity-100 disabled:opacity-20"
          style={{ color: colorTheme.foreground }}
          title="Refresh"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
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
                <code className="font-mono">{ollamaUrl}</code>.
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
                Open the terminal and run{' '}
                <code className="font-mono px-1 py-0.5 rounded"
                  style={{ backgroundColor: `${colorTheme.accent}20`, color: colorTheme.accent }}>
                  docker exec project-s-ollama ollama pull llama3.2
                </code>{' '}
                to download your first model.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider opacity-40 mb-3" style={{ color: colorTheme.foreground }}>
              {models.length} {models.length === 1 ? 'model' : 'models'} available
            </p>
            {models.map(model => (
              <div
                key={model.name}
                className="flex items-center justify-between p-3 rounded-xl border transition-colors"
                style={{
                  borderColor: colorTheme.border,
                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${colorTheme.accent}15` }}>
                    <BrainCircuit className="h-4 w-4" style={{ color: colorTheme.accent }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: colorTheme.foreground }}>{model.name}</p>
                    <p className="text-[10px] opacity-40" style={{ color: colorTheme.foreground }}>
                      {new Date(model.modified_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-40" style={{ color: colorTheme.foreground }}>
                  <HardDrive className="h-3 w-3" />
                  <span className="text-xs">{formatSize(model.size)}</span>
                </div>
              </div>
            ))}
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
