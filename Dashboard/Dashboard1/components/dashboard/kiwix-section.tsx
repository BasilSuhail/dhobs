"use client"

import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { BookOpen, FileText, ExternalLink } from "lucide-react"

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
  const [zimFiles, setZimFiles] = useState<ZimFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setServiceUrl(`http://${window.location.hostname}:8084`)
  }, [])

  useEffect(() => {
    fetch('/api/kiwix')
      .then(r => r.json())
      .then(d => setZimFiles(d.files || []))
      .catch(() => setZimFiles([]))
      .finally(() => setLoading(false))
  }, [])

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
      {/* ZIM file status bar */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-2 border-b text-xs"
        style={{ borderColor: colorTheme.border }}
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" style={{ color: colorTheme.accent }} />
        {loading ? (
          <span className="opacity-40" style={{ color: colorTheme.foreground }}>Scanning library…</span>
        ) : zimFiles.length > 0 ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold" style={{ color: colorTheme.foreground }}>
              {zimFiles.length} ZIM {zimFiles.length === 1 ? 'file' : 'files'} available
            </span>
            {zimFiles.map(f => (
              <span key={f.name} className="flex items-center gap-1 opacity-50" style={{ color: colorTheme.foreground }}>
                <FileText className="h-3 w-3" />
                {f.name.replace('.zim', '')}
                <span className="opacity-60">({formatSize(f.sizeBytes)})</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="opacity-50" style={{ color: colorTheme.foreground }}>No ZIM files found in</span>
            <code className="px-1.5 py-0.5 rounded text-[10px] font-mono opacity-60"
              style={{ backgroundColor: `${colorTheme.accent}20`, color: colorTheme.accent }}>
              ./data/kiwix/
            </code>
            <a
              href="https://library.kiwix.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-medium transition-opacity hover:opacity-80"
              style={{ color: colorTheme.accent }}
            >
              Download ZIM files
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Kiwix iframe */}
      <div className="flex-1 relative">
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
                Your offline library is empty
              </p>
              <p className="text-xs opacity-40 max-w-xs" style={{ color: colorTheme.foreground }}>
                Download <code>.zim</code> files from{' '}
                <a href="https://library.kiwix.org" target="_blank" rel="noopener noreferrer"
                  className="underline" style={{ color: colorTheme.accent }}>
                  library.kiwix.org
                </a>{' '}
                and place them in <code className="font-mono">./data/kiwix/</code> then restart the Kiwix container.
              </p>
            </div>
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
