import { useEffect, useState, type ReactNode, createContext, useContext } from 'react'

type Theme = 'dark' | 'light'
const KEY = 'devora-react-theme'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {}
})

function initialTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {}
  return 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {}
  }, [theme])

  return (
    <ThemeContext.Provider
      value={{ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
