import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'

export function NotFound() {
  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '70dvh' }}>
      <section className="panel panel-pad" style={{ maxWidth: 480 }} aria-labelledby="nf-h">
        <p className="mono fs-12 muted">404</p>
        <h1 id="nf-h" className="mono" style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>
          This page doesn't exist
        </h1>
        <p className="muted fs-14" style={{ marginTop: 'var(--sp-3)' }}>
          What happened: the address you opened doesn't match any page — maybe a typo, maybe an old link.
        </p>
        <p className="muted fs-14" style={{ marginTop: 'var(--sp-2)' }}>
          Next step: go back to Learn — everything is reachable from there.
        </p>
        <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
          <Link className="btn btn-primary" to="/">
            Back to Learn
            <Icon name="arrowR" size={14} />
          </Link>
        </div>
      </section>
    </div>
  )
}
