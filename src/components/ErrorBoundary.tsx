import { Component, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    // A stale index.html (cached before a deploy) references hashed chunks
    // that no longer exist — the import 404s and retrying can never fix it.
    // Only a full reload fetches the fresh index.html. Detect that case and
    // make "Try again" a real reload; anything else retries in place.
    const stale = /failed to fetch dynamically imported module|importing a module script failed|loading chunk|error loading dynamically/i.test(
      this.state.error.message
    )
    return (
      <main className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '70dvh' }}>
        <section className="panel panel-pad" style={{ maxWidth: 520 }} role="alert">
          <p className="row" style={{ color: 'var(--danger)', gap: 'var(--sp-2)' }}>
            <Icon name="alert" size={18} />
            <strong style={{ fontSize: 'var(--fs-16)' }}>Something went wrong</strong>
          </p>
          <p className="muted fs-14" style={{ marginTop: 'var(--sp-3)' }}>
            What happened: an unexpected error stopped this page ({this.state.error.message}).
          </p>
          <p className="muted fs-14" style={{ marginTop: 'var(--sp-2)' }}>
            What was expected: the page should have rendered normally. Your saved progress and code
            in this browser are not affected.
          </p>
          <p className="muted fs-14" style={{ marginTop: 'var(--sp-2)' }}>
            Next step: try reloading. If it keeps happening, tell us the page and error text above.
          </p>
          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (stale) {
                  window.location.reload()
                  return
                }
                this.setState({ error: null })
              }}
            >
              {stale ? 'Reload the app' : 'Try again'}
            </button>
            <a className="btn btn-secondary" href="/">
              Back to Learn
            </a>
          </div>
        </section>
      </main>
    )
  }
}
