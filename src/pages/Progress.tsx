import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { PATHS } from '../lib/curriculum'
import {
  useProgress,
  pathCompletion,
  skillChecklist,
  weakestSkill,
  streakDays,
  ALL_LESSONS_COUNT
} from '../lib/progress'
import { ProgressBar } from '../components/JourneyChecklist'
import { ActivityGraph } from '../components/ActivityGraph'

export function Progress() {
  const [progress] = useProgress()
  const weak = weakestSkill(progress)
  const streak = streakDays(progress)
  const doneCount = Object.keys(progress.completed).length
  const activePaths = PATHS.filter((p) => p.lessons.some((l) => progress.completed[l.id]))
  // the first uncompleted lesson teaching the weakest skill — the "recommended next" target
  const nextForWeak = weak
    ? (() => {
        for (const p of PATHS) for (const l of p.lessons) if (l.skill === weak && !progress.completed[l.id]) return { lesson: l }
        return null
      })()
    : null
  const firstLesson = (() => {
    for (const p of PATHS) for (const l of p.lessons) if (!progress.completed[l.id]) return { lesson: l }
    return null
  })()

  return (
    <div className="page">
      <PageHeader
        trail={[{ label: 'Progress' }]}
        title="Progress by skill"
        sub="Not one big percentage — the individual skills you're building."
      />

      <div className="grid grid-3">
        <div className="panel panel-pad">
          <p className="label">current streak</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
            {streak} <span className="muted fs-14">day{streak === 1 ? '' : 's'}</span>
          </p>
          <p className="muted fs-12">consecutive days with at least one lesson</p>
        </div>
        <div className="panel panel-pad">
          <p className="label">lessons completed</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
            {doneCount}
            <span className="muted fs-12"> / {ALL_LESSONS_COUNT}</span>
          </p>
        </div>
        <div className="panel panel-pad">
          <p className="label">weakest skill</p>
          <p style={{ fontSize: 'var(--fs-16)', fontWeight: 600 }}>{weak ?? '—'}</p>
          {weak && <p className="muted fs-12">work this one next</p>}
        </div>
      </div>

      <section className="panel panel-pad section-gap">
        <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
          Consistency
        </h2>
        <ActivityGraph activity={progress.activity} />
      </section>

      {weak && (
        <section className="panel panel-pad section-gap" style={{ borderLeft: '3px solid var(--accent)', display: 'grid', gap: 'var(--sp-3)' }}>
          <p className="label">recommended next</p>
          <p style={{ fontSize: 'var(--fs-16)', fontWeight: 600 }}>
            Practice <span style={{ color: 'var(--accent)' }}>{weak}</span> — it's your most-missed skill right now.
          </p>
          <Link
            className="btn btn-primary"
            to={`/lesson/${nextForWeak?.lesson.id ?? firstLesson?.lesson.id ?? ''}`}
            style={{ justifySelf: 'start' }}
          >
            Open that lesson
            <Icon name="arrowR" size={14} />
          </Link>
        </section>
      )}

      <section className="section-gap">
        <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
          Paths you're on
        </h2>
        {activePaths.length === 0 ? (
          <div className="empty section-gap">
            <h3>No lessons yet</h3>
            <p>Progress begins the moment you finish your first lesson — even one.</p>
            <Link className="btn btn-primary" to="/paths">
              Start a path
            </Link>
          </div>
        ) : (
          <div className="section-gap" style={{ display: 'grid', gap: 'var(--sp-4)' }}>
            {activePaths.map((p) => {
              const c = pathCompletion(progress, p.id)
              const skills = skillChecklist(progress, p.id)
              return (
                <div key={p.id} className="panel panel-pad">
                  <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
                    <div>
                      <h3 style={{ fontSize: 'var(--fs-16)', fontWeight: 600 }}>{p.title}</h3>
                      <p className="muted fs-12 mono">
                        {c.done}/{c.total} lessons
                      </p>
                    </div>
                    <Link className="btn btn-secondary btn-sm" to={`/paths/${p.id}`}>
                      Open
                    </Link>
                  </div>
                  <ProgressBar ratio={c.ratio} label={`${p.title} progress`} />
                  <div className="chiprow" style={{ marginTop: 'var(--sp-3)' }}>
                    {skills.map((s) => (
                      <span key={s.skill} className="badge" data-state={s.status} style={s.status === 'done' ? { color: 'var(--success)', borderColor: 'var(--success)' } : s.status === 'current' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}>
                        {s.status === 'done' ? <Icon name="check" size={11} /> : null}
                        {s.skill} · {s.done}/{s.total}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
