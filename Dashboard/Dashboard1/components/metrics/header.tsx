export function Header() {
  return (
    <header className="px-4 py-3 border-b border-border">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">System Monitor</h1>
          <p className="text-xs text-muted-foreground">Real-time resource usage monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            LIVE
          </span>
        </div>
      </div>
    </header>
  )
}
