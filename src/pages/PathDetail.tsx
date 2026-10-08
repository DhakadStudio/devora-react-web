import { useCallback, useEffect, useState, useContext } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  listPathsTree,
  type PathSummary,
  type CourseSummary,
  type LessonRef,
  type PathTree
} from '../engines/curriculum'
import { getProjectForModule } from '../engines/project'
import { useProgress, moduleState, pathCompletion, firstUnfinishedLesson } from '../engines/progress'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { JourneyNode, ProgressBar } from '../components/JourneyChecklist'
import { getSupabase } from '../lib/supabase'
import { CurriculumContext } from '../providers/CurriculumProvider'

interface ModuleDetail {
  id: string
  title: string
  lessons: LessonRef[]
  project: { id: string; title: string } | null
}

interface PathDetailData {
  path: PathSummary
  courses: CourseSummary[]
  modulesByCourse: Record<string, ModuleDetail[]>
  allLessonIds: string[]
  moduleByLesson: Record<string, string>
  lessonTitles: Record<string, string>
}

async function loadPathDetailFromTree(tree: PathTree[], pathId: string): Promise<PathDetailData | null> {
  const path = tree.find((p) => p.id === pathId)
  if (!path) return null
  const courses = path.courses.map((c) => ({ id: c.id, title: c.title, summary: c.summary, position: c.position }))
  const modulesByCourse: Record<string, ModuleDetail[]> = {}
  const allLessonIds: string[] = []
  const moduleByLesson: Record<string, string> = {}
  const lessonTitles: Record<string, string> = {}
  for (const course of path.courses) {
    const projectLookup = await Promise.all(
      course.modules.map(async (mod) => ({ mod, project: await getProjectForModule(mod.id) }))
    )
    const details: ModuleDetail[] = projectLookup.map(({ mod, project }) => ({
      id: mod.id,
      title: mod.title,
      lessons: mod.lessons.map((l) => ({ id: l.id, title: l.title, position: l.position })),
      project: project ? { id: project.id, title: project.title } : null
    }));
    for (const detail of details) {
      for (const lesson of detail.lessons) {
        moduleByLesson[lesson.id] = detail.id
        lessonTitles[lesson.id] = lesson.title
        allLessonIds.push(lesson.id)
      }
    }
    modulesByCourse[course.id] = details
  }
  return { path, courses, modulesByCourse, allLessonIds, moduleByLesson, lessonTitles }
}

export function PathDetail() {
  const { pathId } = useParams()
  const [progress] = useProgress()
  const { data: treeData, status, error, refetch } = useContext(CurriculumContext)
  const [openModule, setOpenModule] = useState<string | null>(null)
  const [pathDetailData, setPathDetailData] = useState<PathDetailData | null>(null)
  const [pathDetailError, setPathDetailError] = useState<Error | null>(null)

  useEffect(() => {
    if (!treeData || !pathId) {
      setPathDetailData(null)
      setPathDetailError(null)
      return
    }

    setPathDetailError(null)
    loadPathDetailFromTree(treeData, pathId)
      .then(data => {
        setPathDetailData(data)
      })
      .catch(err => {
        console.error(err)
        setPathDetailError(err)
      })
  }, [treeData, pathId])

  // Determine if we are loading
  const isLoading =
    status === 'loading' ||
    (status === 'ready' && pathDetailData === null && pathDetailError === null)

  // Determine if we have an error
  const hasError =
    status === 'error' ||
    (status === 'ready' && pathDetailError !== null)

  if (isLoading) {
    return (
      <div className="page" aria-busy="true" aria-label="Loading path">
        <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 'var(--sp-4)' }} />
        <div className="skeleton" style={{ height: 32, width: 320, marginBottom: 'var(--sp-3)' }} />
        <div className="grid path-layout">
          <div className="skeleton" style={{ height: 280 }} />
          <div className="skeleton" style={{ height: 280 }} />
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="page">
        <section className="panel panel-pad rise" role="alert">
          <p className="label">something went wrong</p>
          <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>
            We couldn't load this path
          </h2>
          <p className="muted fs-14"style={{ marginTop: 'var(--sp-2)' }}>
            Check your connection and try again.
          </p>
          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <button className="btn btn-primary" onClick={refetch}>
              Try again
              <Icon name="rotate" size={14} />
            </button>
            <Link className="btn btn-secondary" to="/paths">
              All paths
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (!pathDetailData) {
    return (
      <div className="page">
        <div className="empty">
          <h3>Path not found</h3>
          <p>That path doesn't exist. The list on the paths page is always accurate.</p>
          <Link className="btn btn-primary" to="/paths">
            All paths
          </Link>
        </div>
      </div>
    )
  }

  const path = pathDetailData.path
  const c = pathCompletion(pathDetailData.allLessonIds, progress)
  const nextId = firstUnfinishedLesson(pathDetailData.allLessonIds, progress)
  const nextTitle = nextId ? pathDetailData.lessonTitles[nextId] : undefined
  const nextModuleId = nextId ? pathDetailData.moduleByLesson[nextId] : undefined
  // the module holding the learner's current (first unfinished) lesson opens by default
  const effectiveOpen = openModule ?? nextModuleId ?? null

  return (
    <div className="page">
      <PageHeader
        trail={[{ label: 'Paths', to: '/paths' }, { label: path.title }]}
        title={path.title}
        sub={path.summary}
      />

      <div className="grid path-layout" style={{ gap: 'var(--sp-5)', alignItems: 'start' }}>

        {/* Journey checklist */}
        <section>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-4)' }}>
            <p className="label">journey checklist</p>
            <span className="badge">{path.hours}h estimated</span>
          </div>
          {pathDetailData.courses.map((course) => {
            const mods = pathDetailData.modulesByCourse[course.id] ?? []
            return (
              <div key={course.id} style={{ marginBottom: 'var(--sp-5)' }}>
                <p className="label" style={{ marginBottom: 'var(--sp-3)', color: 'var(--muted)' }}>
                  {course.title}
                </p>
                <ol className="journey">
                  {mods.map((mod) => {
                    const lessonIds = mod.lessons.map((l) => l.id)
                    const mp = pathCompletion(lessonIds, progress)
                    const ms = moduleState(lessonIds, progress)
                    const state = ms === 'completed' ? 'done' : ms === 'not-started' ? 'todo' : 'current'
                    const open = effectiveOpen === mod.id
                    return (
                      <li key={mod.id} className="journey-item" data-state={state}>
                        <JourneyNode state={state} />
                        <div>
                          <button
                            className="journey-title"
                            onClick={() => setOpenModule(open ? null : mod.id)}
                            style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, textAlign: 'left', color: state === 'done' ? 'var(--muted)' : 'var(--text)' }}
                            aria-expanded={open}
                          >
                            {mod.title}
                            <span className="journey-meta">
                              {mp.done}/{mp.total}
                            </span>
                            <Icon name={open ? 'chevronD' : 'chevronR'} size={14} />
                          </button>

                          {mod.project && (
                            <Link className="btn btn-secondary btn-sm" to={`/project/${mod.project.id}`} style={{ marginTop: 'var(--sp-2)' }}>
                              Module project{mod.project.title ? `: ${mod.project.title}` : ''}
                            </Link>
                          )}

                          {open && (
                            <div className="journey-body" style={{ marginTop: 'var(--sp-3)' }}>
                              {mod.lessons.map((l) => {
                                const lessonStatus = progress.lessons[l.id]?.status
                                const done = lessonStatus === 'passed' || lessonStatus === 'completed'
                                return (
                                  <Link key={l.id} className="journey-row" to={`/lesson/${l.id}`} data-state={done ? 'done' : 'todo'}>
                                    <span style={{ color: done ? 'var(--success)' : 'var(--muted)' }}>
                                      <Icon name={done ? 'check' : 'chevronR'} size={14} />
                                    </span>
                                    <span className="journey-lesson">
                                      {l.title}
                                    </span>
                                    {done && <span className="badge badge-success">done</span>}
                                    {!done && nextId === l.id && <span className="badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>up next</span>}
                                  </Link>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </li>
                    )}
                  )}
                </ol>
              </div>
            )
          })}
        </section>

        {/* Sidebar: progress + facts */}
        <div style={{ display: 'grid', gap: 'var(--sp-4)', position: 'sticky', top: 'var(--sp-5)' }}>
          <div className="panel panel-pad">
            <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>your progress</p>
            <ProgressBar ratio={c.ratio} label={`${c.done} of ${c.total} lessons`} />
            <p className="muted fs-12 mono" style={{ marginTop: 'var(--sp-3)' }}>
              Next up: {nextTitle ?? '— all done'}
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

          {nextId && (
            <Link className="btn btn-primary" to={`/lesson/${nextId}`} style={{ width: '100%', justifyContent: 'center' }}>
              Continue this path
              <Icon name="arrowR" size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}