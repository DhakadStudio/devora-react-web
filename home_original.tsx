import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { CHALLENGES } from '../lib/curriculum'
import {
  listPathsTree,
  type PathSummary,
  type LessonRef
} from '../engines/curriculum'
import { useProgress, pathCompletion, firstUnfinishedLesson } from '../engines/progress'
import { ProgressBar } from '../components/JourneyChecklist'
import { getSupabase } from '../lib/supabase'

interface LessonMeta {
  pathId: string
  pathTitle: string
  moduleTitle: string
  lessonTitle: string
}

interface CurriculumData {
  paths: PathSummary[]
  lessonMeta: Record<string, LessonMeta>
  lessonsByPath: Record<string, LessonRef[]>
  allLessonIds: string[]
}

/** One DB request: the whole curriculum tree, composed into flat lookups. */
async function loadCurriculum(): Promise<CurriculumData> {
  const tree = await listPathsTree()
  const lessonMeta: Record<string, LessonMeta> = {}
  const lessonsByPath: Record<string, LessonRef[]> = {}
  const allLessonIds: string[] = []
  for (const path of tree) {
    const lessons: LessonRef[] = []
    for (const course of path.courses) {
      for (const mod of course.modules) {
        for (const lesson of mod.lessons) {
          lessons.push(lesson)
          lessonMeta[lesson.id] = {
            pathId: path.id,
            pathTitle: path.title,
            moduleTitle: mod.title,
            lessonTitle: lesson.title
          }
        }
      }
    }
    lessonsByPath[path.id] = lessons
    allLessonIds.push(...lessons.map((l) => l.id))
  }
  return { paths: tree, lessonMeta, lessonsByPath, allLessonIds }
}

export function Home() {
  const [progress] = useProgress()
  const [data, setData] = useState<CurriculumData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    if (!getSupabase()) {
      setStatus('error')
      return
    }
    loadCurriculum()
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])

  const done = data ? pathCompletion(data.allLessonIds, progress) : { done: 0, total: 0, ratio: 0 }
  const doneCount = done.done
  const allDone = done.total > 0 && done.done === done.total
  const started = Object.keys(progress.lessons).length > 0
  const nextId = data ? firstUnfinishedLesson(data.allLessonIds, progress) : null
  const nextMeta = data && nextId ? data.lessonMeta[nextId] : undefined
  const pathProgress = nextMeta
    ? pathCompletion(
        (data?.lessonsByPath[nextMeta.pathId] ?? []).map((l) => l.id),
        progress
      )
    : { done: 0, total: 0, ratio: 0 }
  const daysActive = Object.keys(progress.activity).length
  const completedChallenges = CHALLENGES.filter(
    (c) => progress.lessons[c.id]?.status === 'completed'
  ).length

  return (
    <div className="page">
      <PageHeader trail={[{ label: 'Home' }]} title="Continue learning" />

      {status === 'loading' && (
        <div aria-busy="true" aria-label="Loading your progress">
          <div className="skeleton" style={{ height: 96, marginBottom: 'var(--sp-4)' }} />
          <div className="grid grid-3">
            <div className="skeleton" style={{ height: 84 }} />
            <div className="skeleton" style={{ height: 84 }} />
            <div className="skeleton" style={{ height: 84 }} />
          </div>
        </div>
      )}

      {status === 'error' && (
        <section className="panel panel-pad rise" role="alert">
          <p className="label">something went wrong</p>
          <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>
            We couldn't load the curriculum
          </h2>
          <p className="muted fs-14" style={{ maxWidth: '60ch', marginTop: 'var(--sp-2)' }}>
            Check your connection and try again — your progress is safe in this browser.
          </p>
          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <button className="btn btn-primary" onClick={retry}>
              Try again
              <Icon name="rotate" size={14} />
            </button>
            <Link className="btn btn-secondary" to="/playground">
              Just try the editor
            </Link>
          </div>
        </section>
      )}

      {status === 'ready' && data && (
        <>
          {/* Dominant: continue card */}
          {started && nextId && nextMeta ? (
            <section
              className="panel panel-pad rise"
              style={{ display: 'grid', gap: 'var(--sp-4)', borderLeft: '3px solid var(--accent)' }}
            >
              <p className="label">Continue learning</p>
              <div className="row">
                <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600 }}>{nextMeta.pathTitle}</h2>
              </div>
              <p className="muted fs-14" style={{ marginTop: '-8px' }}>
                {nextMeta.moduleTitle} → {nextMeta.lessonTitle}
              </p>
              <div className="row">
                <Link className="btn btn-primary" to={`/lesson/${nextId}`}>
                  Continue
                  <Icon name="arrowR" size={14} />
                </Link>
                <span className="muted fs-12 mono">
                  {doneCount} lesson{doneCount === 1 ? '' : 's'} done so far
                </span>
              </div>
              {pathProgress.total > 0 && (
                <ProgressBar ratio={pathProgress.ratio} label={nextMeta.pathTitle} />
              )}
            </section>
          ) : (
            <section className="panel panel-pad rise">
              <p className="label">{allDone ? 'All done' : 'Start here'}</p>
              <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>
                {allDone ? "You've finished everything here" : 'Your first line is one click away'}
              </h2>
              <p className="muted fs-14" style={{ maxWidth: '60ch', marginTop: 'var(--sp-2)' }}>
                {allDone
                  ? 'Try a challenge to keep the streak going.'
                  : 'Pick a beginner path. No account needed — progress lives in this browser.'}
              </p>
              <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
                <Link className="btn btn-primary" to={allDone ? '/challenges' : '/paths'}>
                  {allDone ? 'Try a challenge' : 'See learning paths'}
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
                <span className="muted fs-12"> / {done.total}</span>
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
          {nextId && nextMeta && (
            <section className="section-gap">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
                  Up next in {nextMeta.pathTitle}
                </h2>
                <Link className="btn btn-secondary btn-sm" to={`/paths/${nextMeta.pathId}`}>
                  Open path
                </Link>
              </div>
              <ol className="journey" role="list">
                {(data.lessonsByPath[nextMeta.pathId] ?? []).slice(0, 4).map((l) => {
                  const lessonStatus = progress.lessons[l.id]?.status
                  const state =
                    lessonStatus === 'passed' || lessonStatus === 'completed'
                      ? 'done'
                      : l.id === nextId
                        ? 'current'
                        : 'todo'
                  return (
                    <li key={l.id} className="journey-item" data-state={state}>
                      <span className="journey-node" aria-hidden="true">
                        {state === 'done' ? (
                          <Icon name="check" size={14} />
                        ) : state === 'current' ? (
                          <Icon name="chevronR" size={14} />
                        ) : (
                          <Icon name="lock" size={12} />
                        )}
                      </span>
                      <Link className="journey-title" to={`/lesson/${l.id}`} style={{ textDecoration: 'none' }}>
                        {l.title}
                        <span className="journey-meta">{data.lessonMeta[l.id]?.moduleTitle}</span>
                      </Link>
                    </li>
                  )
                })}
                <li>
                  <Link className="btn btn-ghost" to={`/paths/${nextMeta.pathId}`} style={{ textDecoration: 'none' }}>
                    See the full checklist
                    <Icon name="arrowR" size={14} />
                  </Link>
                </li>
              </ol>
            </section>
          )}

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
        </>
      )}
    </div>
  )
}
