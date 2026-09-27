import { NavLink, Link } from 'react-router-dom'
import { Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../lib/auth'

export const NAV = [
  { to: '/', label: 'Learn', icon: 'home' },
  { to: '/paths', label: 'Paths', icon: 'route' },
  { to: '/challenges', label: 'Challenges', icon: 'target' },
  { to: '/playground', label: 'Playground', icon: 'beaker' },
  { to: '/progress', label: 'Progress', icon: 'chart' },
  { to: '/profile', label: 'Profile', icon: 'user' }
] as const

const MOBILE_NAV = NAV.filter((n) => n.to !== '/profile')

export function Sidebar({ collapsed, onToggleCollapse }: { collapsed?: boolean; onToggleCollapse?: () => void }) {
  const { user } = useAuth()
  const name = user?.email?.split('@')[0] ?? 'Learner'
  return (
    <>
      <aside className="sidebar" aria-label="Primary">
        <Link to="/" className="sidebar-brand" aria-label="Devora home">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="terminal" size={15} />
          </span>
          <span className="sidebar-brand-text">devora</span>
        </Link>
        <nav className="sidebar-nav" aria-label="Main sections">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className="nav-item"
              aria-label={n.label}
            >
              {({ isActive }) => (
                <>
                  <Icon name={n.icon as never} size={20} />
                  <span className="nav-label">{n.label}</span>
                  {isActive && <span className="sr-only">(current)</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link to="/profile" className="avatar" aria-label={`Profile (${name})`}>
            {name.slice(0, 1).toUpperCase()}
          </Link>
          <span className="whoami muted fs-12 row-grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </span>
          <ThemeToggle />
          {onToggleCollapse && (
            <button
              type="button"
              className="btn btn-ghost sidebar-collapse"
              onClick={onToggleCollapse}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              <Icon name={collapsed ? 'chevronR' : 'chevronL'} size={16} />
            </button>
          )}
        </div>
      </aside>

      <nav className="bottom-bar" aria-label="Main sections">
        {MOBILE_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}>
            <Icon name={n.icon as never} size={20} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
