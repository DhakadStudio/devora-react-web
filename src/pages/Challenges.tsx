import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { CHALLENGES } from '../lib/curriculum'
import { useProgress } from '../lib/progress'

const DIFFICULTIES = ['All', 'Beginner', 'Intermediate'] as const
const STATES = ['All', 'Not done', 'Done'] as const

export function Challenges() {
  const [progress] = useProgress()
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('All')
  const [state, setState] = useState<(typeof STATES)[number]>('All')
  const topics = useMemo(() => ['All', ...Array.from(new Set(CHALLENGES.map((c) => c.topic)))], [])
  const [topic, setTopic] = useState<(typeof topics)[number]>('All')

  const list = CHALLENGES.filter((c) => {
    const completed = Boolean(progress.completed[c.id])
    if (difficulty !== 'All' && c.difficulty !== difficulty) return false
    if (topic !== 'All' && c.topic !== topic) return false
    if (state === 'Done' && !completed) return false
    if (state === 'Not done' && completed) return false
    return true
  })

  return (
    <div className="page">
      <PageHeader
        trail={[{ label: 'Challenges' }]}
        title="Practice challenges"
        sub="No lecture up front — solve, run the checks, get better. One challenge at a time."
      />

      <div className="row" style={{ rowGap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
        <span className="label" style={{ width: 78 }}>Difficulty</span>
        <div className="chiprow" role="group" aria-label="Filter by difficulty">
          {DIFFICULTIES.map((d) => (
            <button key={d} className="chip" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="row" style={{ rowGap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
        <span className="label" style={{ width: 78 }}>Topic</span>
        <div className="chiprow" role="group" aria-label="Filter by topic">
          {topics.map((t) => (
            <button key={t} className="chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="row" style={{ rowGap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
        <span className="label" style={{ width: 78 }}>State</span>
        <div className="chiprow" role="group" aria-label="Filter by completion">
          {STATES.map((s) => (
            <button key={s} className="chip" aria-pressed={state === s} onClick={() => setState(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <h3>No challenges match</h3>
          <p>Try loosening one filter — the list updates instantly.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {list.map((c) => {
            const done = Boolean(progress.completed[c.id])
            return (
              <Link key={c.id} className="card" to={`/challenges/${c.id}`}>
                <div className="row" style={{ gap: 'var(--sp-2)' }}>
                  <span className="badge">{c.difficulty}</span>
                  <span className="badge">{c.topic}</span>
                  <span className="muted fs-12 mono" style={{ marginLeft: 'auto' }}>
                    {c.minutes} min
                  </span>
                </div>
                <h2 className="card-title" style={{ marginTop: 'var(--sp-3)' }}>
                  {c.title}
                </h2>
                <p className="card-sub" style={{ marginTop: 'var(--sp-2)' }}>
                  {c.teaser}
                </p>
                <p className="row" style={{ marginTop: 'var(--sp-3)', gap: 'var(--sp-1)', color: done ? 'var(--success)' : 'var(--muted)', fontSize: 'var(--fs-14)' }}>
                  {done ? (
                    <>
                      <Icon name="check" size={14} /> Solved
                    </>
                  ) : (
                    <>
                      <Icon name="chevronR" size={14} /> Not solved yet
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
