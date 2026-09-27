import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { PATHS, CHALLENGES } from '../lib/curriculum'
import { useProgress, pathCompletion } from '../lib/progress'
import { ProgressBar } from '../components/JourneyChecklist'

export function Home() {
  const [progress] = useProgress()
  const started = Object.keys(progress.completed).length > 0
  const current = PATHS.flatMap((p) => p.lessons.map((l) => ({ p, l }))).find(
    ({ l }) => !progress.completed[l.id]
  )
  const currentPath = current?.p
  const nextLesson = current?.l
  const doneCount = Object.keys(progress.completed).length
  const skillMap = new Map<string, { done: number; total: number }>()
  for (const p of PATHS)
    for (const l of p.lessons) {
      const r = skillMap.get(l.skill) ?? { done: 0, total: 0 }
      r.total += 1
      if (progress.completed[l.id]) r.done += 1
      skillMap.set(l.skill, r)
    }
  const skills = Array.from(skillMap, ([skill, v]) => ({ skill, ...v }))
    .sort((a, b) => a.done / a.total - b.done / b.total)
    .slice(0, 6)
  const daysActive = Object.keys(progress.activity).length
  const completedChallenges = CHALLENGES.filter((c) => progress.completed[c.id]).length

  return (
    <div className="page">
      <PageHeader trail={[{ label: 'Home' }]} title="Continue learning" />

      {/* Dominant: continue card */}
      {started && currentPath && nextLesson ? (
        <section className="panel panel-pad rise" style={{ display: 'grid', gap: 'var(--sp-4)', borderLeft: '3px solid var(--accent)' }}>
          <p className="label">Continue learning</p>
          <div className="row">
            <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600 }}>
              {currentPath.title}
            </h2>
          </div>
          <p className="muted fs-14" style={{ marginTop: '-8px' }}>
            {nextLesson.module} → {nextLesson.title} · {nextLesson.minutes} min
          </p>
          <div className="row">
            <Link className="btn btn-primary" to={`/lesson/${nextLesson.id}`}>
              Continue
              <Icon name="arrowR" size={14} />
            </Link>
            <span className="muted fs-12 mono">
              {doneCount} lesson{doneCount === 1 ? '' : 's'} done so far
            </span>
          </div>
          {currentPath && (
            <ProgressBar ratio={pathCompletion(progress, currentPath.id).ratio} label={currentPath.title} />
          )}
        </section>
      ) : (
        <section className="panel panel-pad rise">
          <p className="label">Start here</p>
          <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>
            Your first line is one click away
          </h2>
          <p className="muted fs-14" style={{ maxWidth: '60ch', marginTop: 'var(--sp-2)' }}>
            Pick a beginner path. No account needed — progress lives in this browser.
          </p>
          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <Link className="btn btn-primary" to="/paths">
              See learning paths
              <Icon name="arrowR" size={14} />
            </Link>
            <Link className="btn btn-secondary" to="/playground">
              Just try the editor
            </Link>
          </div>
        </section>
      )}

      {/* Stats strip */}
      <section className="grid grid-3 section-gap">
        <div className="panel panel-pad">
          <p className="label">lessons done</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
            {doneCount}
            <span className="muted fs-12"> / {PATHS.reduce((n, p) => n + p.lessons.length, 0)}</span>
          </p>
        </div>
        <div className="panel panel-pad">
          <p className="label">days active</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
            {daysActive}
          </p>
        </div>
        <div className="panel panel-pad">
          <p className="label">challenges solved</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
            {completedChallenges}
            <span className="muted fs-12"> / {CHALLENGES.length}</span>
          </p>
        </div>
      </section>

      {/* Next up */}
      {nextLesson && (
        <section className="section-gap">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
            <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
              Up next in {currentPath?.title ?? 'your path'}
            </h2>
            <Link className="btn btn-secondary btn-sm" to={`/paths/${currentPath?.id}`}>
              Open path
            </Link>
          </div>
          <ol className="journey" role="list">
            {(currentPath?.lessons ?? []).slice(0, 4).map((l) => {
              const state = progress.completed[l.id] ? 'done' : l.id === nextLesson.id ? 'current' : 'todo'
              return (
                <li key={l.id} className="journey-item" data-state={state}>
                  <span className="journey-node" aria-hidden="true">
                    {state === 'done' ? <Icon name="check" size={14} /> : state === 'current' ? <Icon name="chevronR" size={14} /> : <Icon name="lock" size={12} />}
                  </span>
                  <Link className="journey-title" to={`/lesson/${l.id}`} style={{ textDecoration: 'none' }}>
                    {l.title}
                    <span className="journey-meta">{l.minutes} min</span>
                  </Link>
                </li>
              )
            })}
            <li>
              <Link className="btn btn-ghost" to={`/paths/${currentPath?.id}`} style={{ textDecoration: 'none' }}>
                See the full checklist
                <Icon name="arrowR" size={14} />
              </Link>
            </li>
          </ol>
        </section>
      )}

      {/* Skill snapshot */}
      <section className="section-gap">
        <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
          Skill snapshot
        </h2>
        <p className="muted fs-14" style={{ maxWidth: 60 }}>
          Progress by skill, not one big percentage.
        </p>
        <div className="grid grid-2 section-gap" style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          {skills.map((s) => (
            <div key={s.skill} className="panel panel-pad" style={{ display: 'grid', gap: 'var(--sp-2)' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--fs-14)' }}>{s.skill}</span>
                <span className="mono fs-12 muted">
                  {s.done}/{s.total}
                </span>
              </div>
              <ProgressBar ratio={s.total ? s.done / s.total : 0} label={s.skill} />
            </div>
          ))}
        </div>
        <Link className="btn btn-secondary btn-sm" to="/progress" style={{ marginTop: 'var(--sp-4)' }}>
          Full progress page
        </Link>
      </section>

      {/* Quick links */}
      <section className="section-gap">
        <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
          Quick jump
        </h2>
        <div className="grid grid-3 section-gap">
          <Link className="card" to="/paths">
            <span className="card-title">Paths</span>
            <p className="card-sub" style={{ marginTop: 'var(--sp-1)' }}>
              Completed · current · upcoming — the full checklist.
            </p>
          </Link>
          <Link className="card" to="/challenges">
            <span className="card-title">Challenges</span>
            <p className="card-sub" style={{ marginTop: 'var(--sp-1)' }}>
              Short, graded practice problems.
            </p>
          </Link>
          <Link className="card" to="/playground">
            <span className="card-title">Playground</span>
            <p className="card-sub" style={{ marginTop: 'var(--sp-1)' }}>
              Open editor, no lesson attached. Save & share.
            </p>
          </Link>
        </div>
      </section>
    </div>
  )
}
