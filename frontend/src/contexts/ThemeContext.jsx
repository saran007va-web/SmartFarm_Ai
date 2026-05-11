import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const THEME_KEY = 'sfai_theme_mode' // 'auto' | 'light' | 'dark'

function computeAutoTheme() {
  const h = new Date().getHours()
  return (h >= 6 && h < 18) ? 'light' : 'dark'
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY)
      return stored || 'auto'
    } catch {
      return 'auto'
    }
  })

  const derived = mode === 'auto' ? computeAutoTheme() : mode

  useEffect(() => {
    const apply = derived === 'dark'
    document.documentElement.classList.toggle('dark', apply)
  }, [derived])

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, mode) } catch {}
  }, [mode])

  return (
    <ThemeContext.Provider value={{ mode, setMode, derived }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export default ThemeContext
