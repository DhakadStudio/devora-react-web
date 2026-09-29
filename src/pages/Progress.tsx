import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { listPaths, listCourses, listModules, listLessons, type PathSummary } from '../engines/curriculum'
import { useProgress, moduleState, pathCompletion, firstUnfinishedLesson, type ModuleState } from '../engines/progress'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { ProgressBar } from '../components/JourneyChecklist'
import { ActivityGraph } from '../components/ActivityGraph'
import { getSupabase } from '../lib/supabase'

interface ModuleChip {
  id: string
  title: string
  lessonIds: string[]
}

interface PathProgressData {
  path: PathSummary
  modules: ModuleChip[]
  allLessonIds: string[]
  lessonTitles: Record<string, string>
}

/** Paths → courses → modules → lessons, composed into per-module lesson lists
 *  and flat lookups — everything the chips and bars need, fetched once. */
async function loadProgressData(): Promise<PathProgressData[]> {
  const paths = await listPaths()
  const result: PathProgressData[] = []
  for (const path of paths) {
    const courses = await listCourses(path.id)
    const modules: ModuleChip[] = []
    const allLessonIds: string[] = []
    const lessonTitles: Record<string, string> = {}
    for (const course of courses) {
      const mods = await listModules(course.id)
      for (const mod of mods) {
        const lessons = await listLessons(mod.id)
        modules.push({ id: mod.id, title: mod.title, lessonIds: lessons.map((l) => l.id) })
        for (const lesson of lessons) {
          lessonTitles[lesson.id] = lesson.title
          allLessonIds.push(lesson.id)
        }
      }
    }
    result.push({ path, modules, allLessonIds, lessonTitles })
  }
  return result
}

/** Current streak from the engine's activity map — computed here so this page
 *  imports no old-lib module (same day-walk the legacy selector used). */
function streakFromActivity(activity: Record<string, number>): number {
  const dates = new Set(Object.keys(activity))
  let streak = 0
  const d = new Date()
  if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak += 1
    d.setDate(d.getDate() - 1)
  }
  return streak
}

const STATE_LABEL: Record<ModuleState, string> = {
  completed: 'done',
  passed: 'passed',
  attempted: 'attempted',
  started: 'started',
  'not-started': 'not started'
}

function chipStyle(state: ModuleState): CSSProperties | undefined {
  if (state === 'completed' || state === 'passed')
    return { color: 'var(--success)', borderColor: 'var(--success)' }
  if (state === 'attempted' || state === 'started')
    return { color: 'var(--accent)', borderColor: 'var(--accent)' }
  return undefined
}

export function Progress() {
  const [progress] = useProgress()
  const [paths, setPaths] = useState<PathProgressData[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    if (!getSupabase()) {
      setStatus('error')
      return
    }
    loadProgressData()
      .then((data) => {
        if (!cancelled) {
          setPaths(data)
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

  if (status === 'loading') {
    return (
      <div className="page" aria-busy="true" aria-label="Loading progress">
        <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 'var(--sp-4)' }} />
        <div className="skeleton" style={{ height: 32, width: 320, marginBottom: 'var(--sp-3)' }} />
        <div className="grid grid-3">
          <div className="skeleton" style={{ height: 84 }} />
          <div className="skeleton" style={{ height: 84 }} />
          <div className="skeleton" style={{ height: 84 }} />
        </div>
        <div className="skeleton" style={{ height: 120, marginTop: 'var(--sp-4)' }} />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="page">
        <PageHeader trail={[{ label: 'Progress' }]} title="Your progress" />
        <section className="panel panel-pad rise" role="alert">
          <p className="label">something went wrong</p>
          <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>
            We couldn't load your paths
          </h2>
          <p className="muted fs-14" style={{ marginTop: 'var(--sp-2)' }}>
            What happened: the content service could not be reached just now.
          </p>
          <p className="muted fs-14" style={{ marginTop: 'var(--sp-2)' }}>
            Next step: check your connection and try again — your progress is safe on this device either way.
          </p>
          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <button className="btn btn-primary" onClick={retry}>
              Try again
              <Icon name="rotate" size={14} />
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (!paths || paths.length === 0) {
    return (
      <div className="page">
        <PageHeader trail={[{ label: 'Progress' }]} title="Your progress" />
        <div className="empty">
          <h3>Nothing to show yet</h3>
          <p>
            When paths are published, each module shows up here — chips mark where you are, bars show how
            far. Progress begins the moment you finish your first lesson — even one.
          </p>
          <Link className="btn btn-primary" to="/paths">
            Start a path
          </Link>
        </div>
      </div>
    )
  }

  const streak = streakFromActivity(progress.activity)
  const allLessonIds = paths.flatMap((p) => p.allLessonIds)
  const lessonTitles: Record<string, string> = {}
  for (const p of paths) Object.assign(lessonTitles, p.lessonTitles)
  const overall = pathCompletion(allLessonIds, progress)
  const allModules = paths.flatMap((p) => p.modules)
  const modulesDone = allModules.filter((m) => moduleState(m.lessonIds, progress) === 'completed').length
  const nextId = firstUnfinishedLesson(allLessonIds, progress)

  return (
    <div className="page">
      <PageHeader
        trail={[{ label: 'Progress' }]}
        title="Your progress"
        sub="Each module at a glance — chips show where you are, bars show how far."
      />

      <div className="grid grid-3">
        <div className="panel panel-pad">
          <p className="label">lessons completed</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
            {overall.done}
            <span className="muted fs-12"> / {overall.total}</span>
          </p>
        </div>
        <div className="panel panel-pad">
          <p className="label">current streak</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
            {streak} <span className="muted fs-14">day{streak === 1 ? '' : 's'}</span>
          </p>
          <p className="muted fs-12">consecutive days with at least one lesson</p>
        </div>
        <div className="panel panel-pad">
          <p className="label">modules completed</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
            {modulesDone}
            <span className="muted fs-12"> / {allModules.length}</span>
          </p>
        </div>
      </div>

      <section className="panel panel-pad section-gap">
        <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
          Consistency
        </h2>
        <ActivityGraph activity={progress.activity} />
      </section>

      {nextId && (
        <section
          className="panel panel-pad section-gap"
          style={{ borderLeft: '3px solid var(--accent)', display: 'grid', gap: 'var(--sp-3)' }}
        >
          <p className="label">recommended next</p>
          <p style={{ fontSize: 'var(--fs-16)', fontWeight: 600 }}>
            Continue with <span style={{ color: 'var(--accent)' }}>{lessonTitles[nextId] ?? 'your next lesson'}</span>
            {' '}— it's the first one you haven't finished.
          </p>
          <Link className="btn btn-primary" to={`/lesson/${nextId}`} style={{ justifySelf: 'start' }}>
            Open that lesson
            <Icon name="arrowR" size={14} />
          </Link>
        </section>
      )}

      <section className="section-gap">
        <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
          Paths you're on
        </h2>
        <div className="section-gap" style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          {paths.map(({ path, modules, allLessonIds: pathLessonIds }) => {
            const c = pathCompletion(pathLessonIds, progress)
            return (
              <div key={path.id} className="panel panel-pad">
                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--fs-16)', fontWeight: 600 }}>{path.title}</h3>
                    <p className="muted fs-12 mono">
                      {c.done}/{c.total} lessons
                    </p>
                  </div>
                  <Link className="btn btn-secondary btn-sm" to={`/paths/${path.id}`}>
                    Open
                  </Link>
                </div>
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  <ProgressBar ratio={c.ratio} label={`${path.title} progress`} />
                </div>
                <div className="chiprow" style={{ marginTop: 'var(--sp-3)' }}>
                  {modules.map((mod) => {
                    const ms = moduleState(mod.lessonIds, progress)
                    const mp = pathCompletion(mod.lessonIds, progress)
                    const target = firstUnfinishedLesson(mod.lessonIds, progress) ?? mod.lessonIds[0]
                    return (
                      <Link
                        key={mod.id}
                        className="badge"
                        data-state={ms}
                        to={target ? `/lesson/${target}` : `/paths/${path.id}`}
                        style={chipStyle(ms)}
                        aria-label={`${mod.title}: ${STATE_LABEL[ms]}, ${mp.done} of ${mp.total} lessons done`}
                      >
                        {(ms === 'completed' || ms === 'passed') && <Icon name="check" size={11} />}
                        {mod.title} · {mp.done}/{mp.total}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
