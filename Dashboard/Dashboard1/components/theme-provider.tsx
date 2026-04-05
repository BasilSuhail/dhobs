"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type ThemeMode = "dark" | "light"

export interface ColorTheme {
  id: string
  name: string
  background: string
  foreground: string
  accent: string
  accentForeground: string
  card: string
  muted: string
  border: string
  preview: {
    bg: string
    text: string
    accent: string
    border?: string
  }
}

export const colorThemes: ColorTheme[] = [
  {
    id: "blackboard",
    name: "Blackboard",
    background: "#0a0a0a",
    foreground: "#f5f5f7",
    accent: "#d4e157",
    accentForeground: "#0a0a0a",
    card: "rgba(20, 20, 20, 0.8)",
    muted: "#86868b",
    border: "rgba(255, 255, 255, 0.1)",
    preview: { bg: "#1a1a1a", text: "#f5f5f7", accent: "#d4e157" },
  },
  {
    id: "classic",
    name: "Classic",
    background: "#ffffff",
    foreground: "#000000",
    accent: "#000000",
    accentForeground: "#ffffff",
    card: "rgba(245, 245, 245, 0.8)",
    muted: "#737373",
    border: "rgba(0, 0, 0, 0.1)",
    preview: { bg: "#ffffff", text: "#000000", accent: "#000000", border: "#e5e5e5" },
  },
  {
    id: "gazette",
    name: "Gazette",
    background: "#3d4654",
    foreground: "#f5f5f7",
    accent: "#8bb8a8",
    accentForeground: "#1a1a1a",
    card: "rgba(50, 55, 65, 0.8)",
    muted: "#9ca3af",
    border: "rgba(255, 255, 255, 0.1)",
    preview: { bg: "#3d4654", text: "#f5f5f7", accent: "#8bb8a8" },
  },
  {
    id: "espresso",
    name: "Espresso",
    background: "#2c2724",
    foreground: "#f5f5f7",
    accent: "#d4a574",
    accentForeground: "#1a1a1a",
    card: "rgba(35, 32, 29, 0.8)",
    muted: "#9ca3af",
    border: "rgba(255, 255, 255, 0.1)",
    preview: { bg: "#2c2724", text: "#f5f5f7", accent: "#d4a574" },
  },
  {
    id: "cab",
    name: "Cab",
    background: "#1a1a1a",
    foreground: "#f5f5f7",
    accent: "#facc15",
    accentForeground: "#1a1a1a",
    card: "rgba(30, 30, 30, 0.8)",
    muted: "#71717a",
    border: "rgba(255, 255, 255, 0.1)",
    preview: { bg: "#facc15", text: "#1a1a1a", accent: "#facc15" },
  },
  {
    id: "cloud",
    name: "Cloud",
    background: "#f5f5f7",
    foreground: "#1d1d1f",
    accent: "#ef4444",
    accentForeground: "#ffffff",
    card: "rgba(255, 255, 255, 0.8)",
    muted: "#86868b",
    border: "rgba(0, 0, 0, 0.1)",
    preview: { bg: "#f5f5f7", text: "#ef4444", accent: "#ef4444", border: "#e5e5e5" },
  },
  {
    id: "lime",
    name: "Lime",
    background: "#1a2e1a",
    foreground: "#d4e157",
    accent: "#84cc16",
    accentForeground: "#0a0a0a",
    card: "rgba(25, 40, 25, 0.8)",
    muted: "#86868b",
    border: "rgba(132, 204, 22, 0.2)",
    preview: { bg: "#1a2e1a", text: "#84cc16", accent: "#84cc16" },
  },
  {
    id: "passion",
    name: "Passion",
    background: "#2d1f3d",
    foreground: "#f5f5f7",
    accent: "#a855f7",
    accentForeground: "#ffffff",
    card: "rgba(35, 25, 50, 0.8)",
    muted: "#9ca3af",
    border: "rgba(168, 85, 247, 0.2)",
    preview: { bg: "#2d1f3d", text: "#f5f5f7", accent: "#a855f7" },
  },
  {
    id: "blues",
    name: "Blues",
    background: "#1e1b4b",
    foreground: "#f5f5f7",
    accent: "#6366f1",
    accentForeground: "#ffffff",
    card: "rgba(30, 27, 75, 0.8)",
    muted: "#9ca3af",
    border: "rgba(99, 102, 241, 0.2)",
    preview: { bg: "#1e1b4b", text: "#f5f5f7", accent: "#6366f1" },
  },
  {
    id: "chalk",
    name: "Chalk",
    background: "#fdf2f8",
    foreground: "#1d1d1f",
    accent: "#ec4899",
    accentForeground: "#ffffff",
    card: "rgba(255, 255, 255, 0.8)",
    muted: "#86868b",
    border: "rgba(236, 72, 153, 0.2)",
    preview: { bg: "#fdf2f8", text: "#1d1d1f", accent: "#ec4899", border: "#fbcfe8" },
  },
  {
    id: "tron",
    name: "Tron",
    background: "#0c1821",
    foreground: "#f5f5f7",
    accent: "#22d3ee",
    accentForeground: "#0a0a0a",
    card: "rgba(12, 24, 33, 0.8)",
    muted: "#86868b",
    border: "rgba(34, 211, 238, 0.2)",
    preview: { bg: "#0c1821", text: "#22d3ee", accent: "#22d3ee" },
  },
  {
    id: "paper",
    name: "Paper",
    background: "#fefce8",
    foreground: "#1d1d1f",
    accent: "#ca8a04",
    accentForeground: "#ffffff",
    card: "rgba(255, 255, 255, 0.8)",
    muted: "#78716c",
    border: "rgba(202, 138, 4, 0.2)",
    preview: { bg: "#fefce8", text: "#1d1d1f", accent: "#ca8a04", border: "#fde68a" },
  },
]

interface ThemeContextType {
  mode: ThemeMode
  colorTheme: ColorTheme
  setMode: (mode: ThemeMode) => void
  setColorTheme: (theme: ColorTheme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark")
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(colorThemes[0])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Landing page always forces dark mode — ignore any saved preference
    if (process.env.NEXT_PUBLIC_LANDING_MODE === 'true') {
      document.documentElement.classList.add("dark")
      applyColorTheme(colorThemes[0])
      return
    }

    const savedThemeId = localStorage.getItem("colorThemeId")

    if (savedThemeId) {
      const theme = colorThemes.find(t => t.id === savedThemeId)
      if (theme) {
        setColorThemeState(theme)
        applyColorTheme(theme)
        const isLightTheme = ["classic", "cloud", "chalk", "paper"].includes(theme.id)
        setModeState(isLightTheme ? "light" : "dark")
        document.documentElement.classList.toggle("dark", !isLightTheme)
      }
    } else {
      document.documentElement.classList.add("dark")
      applyColorTheme(colorThemes[0])
    }
  }, [])

  const applyColorTheme = (theme: ColorTheme) => {
    const root = document.documentElement
    root.style.setProperty("--background", theme.background)
    root.style.setProperty("--foreground", theme.foreground)
    root.style.setProperty("--primary", theme.accent)
    root.style.setProperty("--primary-foreground", theme.accentForeground)
    root.style.setProperty("--accent", theme.accent)
    root.style.setProperty("--accent-foreground", theme.accentForeground)
    root.style.setProperty("--card", theme.card)
    root.style.setProperty("--muted-foreground", theme.muted)
    root.style.setProperty("--border", theme.border)
    root.style.setProperty("--glass-border", theme.border)
    root.style.setProperty("--glow-primary", `${theme.accent}40`)
  }

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    document.documentElement.classList.toggle("dark", newMode === "dark")
  }

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme)
    applyColorTheme(theme)
    localStorage.setItem("colorThemeId", theme.id)
    const isLightTheme = ["classic", "cloud", "chalk", "paper"].includes(theme.id)
    setMode(isLightTheme ? "light" : "dark")
  }

  // Always render children to avoid router initialization issues
  // Use default values before mount, then update with saved preferences
  return (
    <ThemeContext.Provider value={{ mode, colorTheme, setMode, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
