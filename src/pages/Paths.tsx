import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { type PathSummary } from '../engines/curriculum'
import { useProgress, pathCompletion } from '../engines/progress'
import { Icon } from '../components/Icon'
import { ProgressBar } from '../components/JourneyChecklist'
import { useContext } from 'react'
import { CurriculumContext } from '../providers/CurriculumProvider'

interface PathCard {
  path: PathSummary
  lessonIds: string[]
}

export function Paths() {
  const [progress] = useProgress()
  const { data: treeData, status, refetch } = useContext(CurriculumContext)

  const pathCards = useMemo(() => {
    if (!treeData) return null
    const cards: PathCard[] = []
    for (const path of treeData) {
      const lessonIds: string[] = []
      for (const course of path.courses) {
        for (const mod of course.modules) {
          for (const lesson of mod.lessons) lessonIds.push(lesson.id)
        }
      }
      cards.push({ path, lessonIds })
    }
    return cards
  }, [treeData])

  if (status === 'loading') {
    return (
      <div className="page">
        <PageHeader
          trail={[{ label: 'Paths' }]}
          title="Learning paths"
          sub="Completed, current, and upcoming — always visible. Pick one; it walks you from zero to a real project."
        />
        <div className="grid grid-2" aria-busy="true" aria-label="Loading paths">
          <div className="skeleton" style={{ height: 220 }} />
          <div className="skeleton" style={{ height: 220 }} />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="page">
        <PageHeader trail={[{ label: 'Paths' }]} title="Your progress" />
        <section className="panel panel-pad rise" role="alert">
          <p className="label">something went wrong</p>
          <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>
            We couldn't load the learning paths
          </h2>
          <p className="muted fs-14" style={{ marginTop: 'var(--sp-2)' }}>
            Check your connection and try again.
          </p>
          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <button className="btn btn-primary" onClick={refetch}>
              Try again
              <Icon name="rotate" size={14} />
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (!pathCards || pathCards.length === 0) {
    return (
      <div className="page">
        <PageHeader trail={[{ label: 'Paths' }]} title="Learning paths" />
        <div className="empty">
          <h3>No paths yet</h3>
          <p>Learning paths will appear here as soon as they're published.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        trail={[{ label: 'Paths' }]}
        title="Learning paths"
        sub="Completed, current, and upcoming — always visible. Pick one; it walks you from zero to a real project."
      />

      {status === 'ready' && pathCards && pathCards.length > 0 && (
        <div className="grid grid-2">
          {pathCards.map(({ path, lessonIds }) => {
            const c = pathCompletion(lessonIds, progress)
            const started = c.done > 0
            const done = c.done === c.total && c.total > 0
            return (
              <Link key={path.id} className="card" to={`/paths/${path.id}`} style={{ padding: 'var(--sp-5)' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="badge">{path.level}</span>
                  <span className="badge">{path.hours}h</span>
                </div>
                <h2 className="card-title" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-16)' }}>
                  {path.title}
                </h2>
                <p className="card-sub" style={{ marginTop: 'var(--sp-2)' }}>
                  {path.summary}
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
      )}
    </div>
  )
}