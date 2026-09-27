import { useTheme } from '../lib/theme'
import { Icon } from './Icon'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="theme-toggle"
      style={{
        width: 44,
        height: 44,
        display: 'grid',
        placeItems: 'center',
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        color: 'var(--muted)'
      }}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  )
}
