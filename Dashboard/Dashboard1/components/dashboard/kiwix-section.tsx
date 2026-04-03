"use client"

import { useState, useEffect, useCallback } from "react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { BookOpen, FileText, FolderOpen, Search, RefreshCw } from "lucide-react"

interface ZimFile {
  name: string
  sizeBytes: number
}

interface KiwixSectionProps {
  isWindow?: boolean
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function KiwixSection({ isWindow }: KiwixSectionProps) {
  const { colorTheme, mode } = useTheme()
  const [serviceUrl, setServiceUrl] = useState("")
  const [managerUrl, setManagerUrl] = useState("")
  const [zimFiles, setZimFiles] = useState<ZimFile[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"browse" | "manage">("browse")
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    setServiceUrl(`http://${window.location.hostname}:8084`)
    setManagerUrl(`http://${window.location.hostname}:8086`)
  }, [])

  const fetchZimFiles = useCallback(() => {
    return fetch('/api/kiwix')
      .then(r => r.json())
      .then(d => {
        setZimFiles(d.files || [])
        return d.files || []
      })
      .catch(() => {
        setZimFiles([])
        return []
      })
  }, [])

  useEffect(() => {
    fetchZimFiles().finally(() => setLoading(false))
  }, [fetchZimFiles])

  // Default to manage tab when library is empty
  useEffect(() => {
    if (!loading && zimFiles.length === 0) setTab("manage")
  }, [loading, zimFiles.length])

  const handleRefresh = async () => {
    setRestarting(true)
    try {
      await fetch('/api/kiwix/restart', { method: 'POST' })
      // Poll until file list changes or 30s timeout
      const start = Date.now()
      const poll = async (): Promise<void> => {
        if (Date.now() - start > 30000) return
        await new Promise(r => setTimeout(r, 2000))
        const files = await fetchZimFiles()
        if (files.length !== zimFiles.length) return
        return poll()
      }
      await poll()
    } finally {
      setRestarting(false)
    }
  }

  const tabStyle = (active: boolean) => ({
    color: active ? colorTheme.accent : colorTheme.foreground,
    borderBottomColor: active ? colorTheme.accent : 'transparent',
    opacity: active ? 1 : 0.4,
  })

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
      {/* Status bar */}
      <div
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b text-xs"
        style={{ borderColor: colorTheme.border }}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <BookOpen className="h-3.5 w-3.5 shrink-0" style={{ color: colorTheme.accent }} />
          {loading ? (
            <span className="opacity-40" style={{ color: colorTheme.foreground }}>Scanning library…</span>
          ) : zimFiles.length > 0 ? (
            <div className="flex items-center gap-3 flex-wrap overflow-hidden">
              <span className="font-semibold whitespace-nowrap" style={{ color: colorTheme.foreground }}>
                {zimFiles.length} ZIM {zimFiles.length === 1 ? 'file' : 'files'}
              </span>
              {zimFiles.slice(0, 2).map(f => (
                <span key={f.name} className="flex items-center gap-1 opacity-50 overflow-hidden whitespace-nowrap" style={{ color: colorTheme.foreground }}>
                  <FileText className="h-3 w-3" />
                  {f.name.replace('.zim', '').slice(0, 20)} · {formatSize(f.sizeBytes)}
                </span>
              ))}
            </div>
          ) : (
            <span className="opacity-50" style={{ color: colorTheme.foreground }}>Library empty — upload a ZIM file to get started</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://library.kiwix.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-md transition-all hover:bg-white/10"
            style={{ color: colorTheme.accent }}
          >
            <Search className="h-3 w-3" />
            Find ZIMs
          </a>
          <button
            onClick={handleRefresh}
            disabled={restarting}
            className="flex items-center gap-1 px-2 py-1 rounded-md transition-all font-medium hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: `${colorTheme.accent}20`, color: colorTheme.accent }}
          >
            <RefreshCw className={cn("h-3 w-3", restarting && "animate-spin")} />
            {restarting ? 'Restarting…' : 'Refresh Library'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="shrink-0 flex border-b text-xs"
        style={{ borderColor: colorTheme.border }}
      >
        {(['browse', 'manage'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 font-medium border-b-2 transition-all capitalize"
            style={tabStyle(tab === t)}
          >
            {t === 'browse'
              ? <span className="flex items-center gap-1.5"><BookOpen className="h-3 w-3" />Browse</span>
              : <span className="flex items-center gap-1.5"><FolderOpen className="h-3 w-3" />Manage</span>
            }
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="flex-1 relative overflow-hidden">
        {tab === 'browse' && (
          <>
            {serviceUrl && zimFiles.length > 0 && (
              <iframe
                src={serviceUrl}
                className="w-full h-full border-0"
                title="Kiwix Offline Knowledge Base"
                allowFullScreen
              />
            )}
            {!loading && zimFiles.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                <BookOpen className="h-12 w-12 opacity-10" style={{ color: colorTheme.foreground }} />
                <div className="text-center space-y-2">
                  <p className="text-sm font-semibold" style={{ color: colorTheme.foreground }}>
                    No ZIM files yet
                  </p>
                  <p className="text-xs opacity-40 max-w-xs" style={{ color: colorTheme.foreground }}>
                    Switch to the <strong>Manage</strong> tab to upload files, or download them from{' '}
                    <a href="https://library.kiwix.org" target="_blank" rel="noopener noreferrer"
                      className="underline" style={{ color: colorTheme.accent }}>
                      library.kiwix.org
                    </a>
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'manage' && managerUrl && (
          <iframe
            src={managerUrl}
            className="w-full h-full border-0"
            title="Kiwix Library Manager"
            allowFullScreen
          />
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
