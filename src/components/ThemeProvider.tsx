/**
 * Theme Provider and Hook
 *
 * Manages application theme (light/dark/system) with localStorage persistence.
 */

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  // Load theme from electron-store on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await window.electron?.settings?.get<Theme>('app.theme')
        if (savedTheme) {
          setThemeState(savedTheme)
        }
      } catch (error) {
        console.error('Failed to load theme:', error)
      }
    }
    loadTheme()
  }, [])

  // Determine the actual theme (resolve 'system' to light/dark)
  useEffect(() => {
    const getActualTheme = (): 'light' | 'dark' => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return theme
    }

    const updateActualTheme = () => {
      const resolved = getActualTheme()
      setActualTheme(resolved)

      // Apply to document
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
    }

    updateActualTheme()

    // Listen to system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => updateActualTheme()
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    }
  }, [theme])

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    // Save to electron-store
    await window.electron?.settings?.set('app.theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
