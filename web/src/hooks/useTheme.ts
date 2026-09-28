import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

// Mirrored by the inline script in index.html, which applies the theme before the first paint.
const STORAGE_KEY = 'name-mnemonics:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function loadTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const apply = () => {
      document.documentElement.dataset.theme = theme === 'system' ? (query.matches ? 'dark' : 'light') : theme
    }
    apply()
    localStorage.setItem(STORAGE_KEY, theme)
    if (theme !== 'system') return
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [theme])

  return [theme, setTheme]
}
