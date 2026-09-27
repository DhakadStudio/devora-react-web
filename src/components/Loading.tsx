export function PageSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 'var(--sp-4)' }} />
      <div className="skeleton" style={{ height: 32, width: 320, marginBottom: 'var(--sp-3)' }} />
      <div className="skeleton" style={{ height: 96, marginBottom: 'var(--sp-4)' }} />
      <div className="grid grid-3">
        <div className="skeleton" style={{ height: 84 }} />
        <div className="skeleton" style={{ height: 84 }} />
        <div className="skeleton" style={{ height: 84 }} />
      </div>
    </div>
  )
}

export function EditorSkeleton() {
  return (
    <div className="workspace" aria-busy="true" aria-label="Loading editor">
      <div className="skeleton" style={{ minHeight: 320 }} />
      <div className="skeleton" style={{ minHeight: 320 }} />
    </div>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
