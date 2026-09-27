import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PATHS } from '../lib/curriculum'
import { useProgress, pathCompletion } from '../lib/progress'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { JourneyNode, ProgressBar } from '../components/JourneyChecklist'

const TYPE_LABEL: Record<string, string> = {
  exercise: 'Exercise',
  concept: 'Concept',
  debugging: 'Debugging',
  project: 'Project'
}

export function PathDetail() {
  const { pathId } = useParams()
  const path = PATHS.find((p) => p.id === pathId)
  const [progress] = useProgress()
  const [openModule, setOpenModule] = useState<string | null>(null)

  const modules = useMemo(() => {
    if (!path) return []
    const byModule = new Map<string, typeof path.lessons>()
    for (const l of path.lessons) {
      const arr = byModule.get(l.module) ?? []
      arr.push(l)
      byModule.set(l.module, arr)
    }
    return Array.from(byModule, ([name, lessons]) => ({ name, lessons }))
  }, [path])

  // the module holding the learner's current (first unfinished) lesson opens by default
  const currentModule = path ? path.lessons.find((l) => !progress.completed[l.id])?.module ?? null : null
  const effectiveOpen = openModule ?? currentModule

  if (!path) {
    return (
      <div className="page">
        <div className="empty">
          <h3>Path not found</h3>
          <p>That path doesn't exist. The list below is always accurate.</p>
          <Link className="btn btn-primary" to="/paths">
            All paths
          </Link>
        </div>
      </div>
    )
  }

  const c = pathCompletion(progress, path.id)
  const nextLesson = path.lessons.find((l) => !progress.completed[l.id])
  const isDone = c.total > 0 && c.done === c.total

  return (
    <div className="page">
      <PageHeader
        trail={[{ label: 'Paths', to: '/paths' }, { label: path.title }]}
        title={path.title}
        sub={path.description}
      />

      <div className="grid path-layout" style={{ gap: 'var(--sp-5)', alignItems: 'start' }}>

        {/* Journey checklist */}
        <section>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-4)' }}>
            <p className="label">journey checklist</p>
            <span className="badge">{path.lessons.reduce((s, l) => s + l.minutes, 0)} min total</span>
          </div>
          <ol className="journey">
            {path.milestones.map((m, i) => (
              <li key={m} className="journey-item" data-state="todo">
                <span className="journey-node" style={{ borderRadius: 'var(--r-sm)' }}>
                  <Icon name="flag" size={14} />
                </span>
                <div className="journey-title">
                  {i + 1}. {m}
                  <span className="journey-meta">milestone</span>
                </div>
              </li>
            ))}

            {modules.map((mod) => {
              const lessonsDone = mod.lessons.filter((l) => progress.completed[l.id]).length
              const moduleState = lessonsDone === mod.lessons.length ? 'done' : lessonsDone > 0 ? 'current' : 'todo'
              const open = effectiveOpen === mod.name
              return (
                <li key={mod.name} className="journey-item" data-state={moduleState}>
                  <JourneyNode state={moduleState} />
                  <div>
                    <button
                      className="journey-title"
                      onClick={() => setOpenModule(open ? null : mod.name)}
                      style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, textAlign: 'left', color: moduleState === 'done' ? 'var(--muted)' : 'var(--text)' }}
                      aria-expanded={open}
                    >
                      {mod.name}
                      <span className="journey-meta">
                        {lessonsDone}/{mod.lessons.length} · {mod.lessons.reduce((s, l) => s + l.minutes, 0)} min
                      </span>
                      <Icon name={open ? 'chevronD' : 'chevronR'} size={14} />
                    </button>

                    {open && (
                      <div className="journey-body" style={{ marginTop: 'var(--sp-3)' }}>
                        {mod.lessons.map((l) => {
                          const done = Boolean(progress.completed[l.id])
                          return (
                            <Link key={l.id} className="journey-row" to={`/lesson/${l.id}`} data-state={done ? 'done' : 'todo'}>
                              <span style={{ color: done ? 'var(--success)' : 'var(--muted)' }}>
                                <Icon name={done ? 'check' : 'chevronR'} size={14} />
                              </span>
                              <span className="journey-lesson">
                                {l.title}
                                <span className="journey-meta" style={{ display: 'block' }}>
                                  {TYPE_LABEL[l.type]} · {l.minutes} min
                                </span>
                              </span>
                              {done && <span className="badge badge-success">done</span>}
                              {!done && nextLesson?.id === l.id && <span className="badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>up next</span>}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}

            {/* Final project, visually distinct */}
            <li className="journey-item" data-state={isDone ? 'done' : 'current'}>
              <span className="journey-node" style={{ borderRadius: 'var(--r-sm)', borderColor: isDone ? 'var(--success)' : 'var(--accent)', color: isDone ? 'var(--success)' : 'var(--accent)' }}>
                <Icon name="flag" size={14} />
              </span>
              <div>
                <div className="journey-title" style={{ color: 'var(--text)' }}>
                  Final project
                </div>
                <p className="muted fs-14" style={{ marginTop: 'var(--sp-1)' }}>
                  Combine everything into something you can reuse and share.
                </p>
                {path.finalProjectId && (
                  <Link className="btn btn-secondary btn-sm" to={`/lesson/${path.finalProjectId}`} style={{ marginTop: 'var(--sp-3)' }}>
                    Open final project
                  </Link>
                )}
              </div>
            </li>
          </ol>
        </section>

        {/* Sidebar: progress + facts */}
        <div style={{ display: 'grid', gap: 'var(--sp-4)', position: 'sticky', top: 'var(--sp-5)' }}>
          <div className="panel panel-pad">
            <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>your progress</p>
            <ProgressBar ratio={c.ratio} label={`${c.done} of ${c.total} lessons`} />
            <p className="muted fs-12 mono" style={{ marginTop: 'var(--sp-3)' }}>
              Next up: {nextLesson ? nextLesson.title : '— all done'}
            </p>
          </div>

          <div className="panel panel-pad">
            <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>prerequisites</p>
            <p className="fs-14" style={{ fontSize: 'var(--fs-15)' }}>
              {path.prerequisites}
            </p>
          </div>

          <div className="panel panel-pad">
            <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>what you'll be able to do</p>
            <ul style={{ paddingLeft: '1.2em', display: 'grid', gap: 'var(--sp-2)', fontSize: 'var(--fs-14)', color: 'var(--muted)' }}>
              {path.outcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>

          {nextLesson && (
            <Link className="btn btn-primary" to={`/lesson/${nextLesson.id}`} style={{ width: '100%', justifyContent: 'center' }}>
              Continue this path
              <Icon name="arrowR" size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
