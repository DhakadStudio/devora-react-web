import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

interface Props {
  trail: { label: string; to?: string }[]
  title: string
  badge?: ReactNode
  sub?: string
  actions?: ReactNode
}

export function PageHeader({ trail, title, badge, sub, actions }: Props) {
  return (
    <header style={{ marginBottom: 'var(--sp-5)' }}>
      <nav className="crumb" aria-label="Breadcrumb">
        <ol style={{ display: 'flex', listStyle: 'none', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          {trail.map((t, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              {i > 0 && (
                <span className="sep" aria-hidden="true">
                  /
                </span>
              )}
              {t.to ? <Link to={t.to}>{t.label}</Link> : <span aria-current="page">{t.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <div className="row" style={{ marginTop: 'var(--sp-2)' }}>
        <h1 className="page-title">{title}</h1>
        {badge}
        {actions && <div className="row-end row">{actions}</div>}
      </div>
      {sub && <p className="page-sub">{sub}</p>}
    </header>
  )
}
