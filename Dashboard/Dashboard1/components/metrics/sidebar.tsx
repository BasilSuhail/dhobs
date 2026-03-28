"use client"

import { LayoutGrid, Activity, MonitorSmartphone, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { icon: "S", label: "System", active: false, isLetter: true },
  { icon: LayoutGrid, label: "Dashboard", active: true },
  { icon: Activity, label: "Analytics", active: false },
  { icon: MonitorSmartphone, label: "Containers", active: false },
  { icon: Settings, label: "Settings", active: false },
]

export function Sidebar() {
  return (
    <aside className="w-14 bg-background border-r border-border flex flex-col items-center py-4 gap-2">
      {navItems.map((item, index) => (
        <button
          key={index}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
            item.active
              ? "bg-secondary text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
          title={item.label}
        >
          {item.isLetter ? (
            <span className="text-sm font-semibold">{item.icon}</span>
          ) : (
            <item.icon className="w-4 h-4" />
          )}
        </button>
      ))}
    </aside>
  )
}
