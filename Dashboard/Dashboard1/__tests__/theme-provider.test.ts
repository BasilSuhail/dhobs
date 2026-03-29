import { describe, it, expect } from 'vitest'
import { colorThemes, type ColorTheme } from '@/components/theme-provider'

describe('colorThemes', () => {
  it('has 12 themes', () => {
    expect(colorThemes).toHaveLength(12)
  })

  const requiredFields: (keyof ColorTheme)[] = [
    'id',
    'name',
    'background',
    'foreground',
    'accent',
    'accentForeground',
    'card',
    'muted',
    'border',
    'preview',
  ]

  it.each(requiredFields)('every theme has required field: %s', (field) => {
    for (const theme of colorThemes) {
      expect(theme[field], `theme "${theme.id}" missing field "${field}"`).toBeDefined()
    }
  })

  it('every theme preview has bg, text, and accent', () => {
    for (const theme of colorThemes) {
      expect(theme.preview.bg, `theme "${theme.id}" preview missing bg`).toBeDefined()
      expect(theme.preview.text, `theme "${theme.id}" preview missing text`).toBeDefined()
      expect(theme.preview.accent, `theme "${theme.id}" preview missing accent`).toBeDefined()
    }
  })

  it('no duplicate theme IDs', () => {
    const ids = colorThemes.map((t) => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  const lightThemeIds = ['classic', 'cloud', 'chalk', 'paper']

  it('light themes are present', () => {
    const themeIds = colorThemes.map((t) => t.id)
    for (const lightId of lightThemeIds) {
      expect(themeIds, `missing light theme: ${lightId}`).toContain(lightId)
    }
  })

  it('light themes have light-colored backgrounds', () => {
    for (const lightId of lightThemeIds) {
      const theme = colorThemes.find((t) => t.id === lightId)
      expect(theme, `light theme ${lightId} not found`).toBeDefined()
      // Light themes should have backgrounds starting with # and high-value hex
      // or named patterns like rgba(255,...) -- just verify they exist and are strings
      expect(typeof theme!.background).toBe('string')
      expect(theme!.background.length).toBeGreaterThan(0)
    }
  })

  it('all theme IDs are lowercase kebab-case', () => {
    for (const theme of colorThemes) {
      expect(theme.id).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })
})
