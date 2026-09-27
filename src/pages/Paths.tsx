import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { PATHS } from '../lib/curriculum'
import { useProgress, pathCompletion } from '../lib/progress'
import { Icon } from '../components/Icon'
import { ProgressBar } from '../components/JourneyChecklist'

export function Paths() {
  const [progress] = useProgress()
  return (
    <div className="page">
      <PageHeader
        trail={[{ label: 'Paths' }]}
        title="Learning paths"
        sub="Completed, current, and upcoming — always visible. Pick one; it walks you from zero to a real project."
      />
      <div className="grid grid-2">
        {PATHS.map((p) => {
          const c = pathCompletion(progress, p.id)
          const started = c.done > 0
          const done = c.done === c.total && c.total > 0
          return (
            <Link key={p.id} className="card" to={`/paths/${p.id}`} style={{ padding: 'var(--sp-5)' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="badge">{p.level}</span>
                <span className="badge">{p.hours}h</span>
              </div>
              <h2 className="card-title" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-16)' }}>
                {p.title}
              </h2>
              <p className="card-sub" style={{ marginTop: 'var(--sp-2)' }}>
                {p.description}
              </p>
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <ProgressBar ratio={c.ratio} label={`${c.done} of ${c.total} done`} />
              </div>
              <p className="row" style={{ marginTop: 'var(--sp-3)', gap: 'var(--sp-1)', color: done ? 'var(--success)' : 'var(--accent)', fontSize: 'var(--fs-14)', fontWeight: 600 }}>
                {done ? (
                  <>
                    <Icon name="check" size={14} /> Complete — open it
                  </>
                ) : started ? (
                  <>
                    Continue <Icon name="arrowR" size={14} />
                  </>
                ) : (
                  <>
                    Start <Icon name="arrowR" size={14} />
                  </>
                )}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
