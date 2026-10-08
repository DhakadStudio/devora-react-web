import { useCallback, useEffect, useState, useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  type PathSummary
} from '../engines/curriculum'
import { useProgress, moduleState, pathCompletion, firstUnfinishedLesson, type ModuleState } from '../engines/progress'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { ProgressBar } from '../components/JourneyChecklist'
import { ActivityGraph } from '../components/ActivityGraph'
import { getSupabase } from '../lib/supabase'
import { useContext } from 'react'
import { CurriculumContext } from '../providers/CurriculumProvider'

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

export function Progress() {
  const [progress] = useProgress()
  const { data: treeData, status, error, refetch } = useContext(CurriculumContext)

  const pathProgressData = useMemo(() => {
    if (!treeData) return null
    const result: PathProgressData[] = []
    for (const path of treeData) {
      const modules: ModuleChip[] = []
      const allLessonIds: string[] = []
      const lessonTitles: Record<string, string> = {}
      
      for (const course of path.courses) {
        for (const mod of course.modules) {
          const lessonIds = mod.lessons.map((l) => l.id)
          modules.push({ 
            id: mod.id, 
            title: mod.title, 
            lessonIds: lessonIds 
          })
          for (const lesson of mod.lessons) {
            lessonTitles[lesson.id] = lesson.title
            allLessonIds.push(lesson.id)
          }
        }
      }
      
      result.push({
        path,
        modules,
        allLessonIds,
        lessonTitles
      })
    }
    return result
  }, [treeData])

   
   // Calculate overall stats
   const allLessonIdsFlat = pathProgressData?.flatMap((p) => p.allLessonIds) || []
   const completedLessons = allLessonIdsFlat.filter(id => {
     // Find which path and lesson this ID belongs to
     let isCompleted = false
     for (const pathData of pathProgressData || []) {
       const lesson = pathData.modules.flatMap(mod => mod.lessonIds).find(lid => lid === id)
       if (lesson) {
         const module = pathData.modules.find(mod => mod.lessonIds.includes(lesson))
         if (module) {
           const ms = moduleState(module.lessonIds, progress)
           return ms === "passed" || ms === "completed"
         }
       }
     }
     return isCompleted
   })
   const completionRate = allLessonIdsFlat.length > 0 ? (completedLessons.length / allLessonIdsFlat.length) * 100 : 0
   
   const allModulesFlat = pathProgressData?.flatMap((p) => p.modules) || []
   const modulesCompletedCount = allModulesFlat.filter(mod => moduleState(mod.lessonIds, progress) === "passed" || moduleState(mod.lessonIds, progress) === "completed").length
   const totalModulesCount = allModulesFlat.length

  if (status === 'loading') {
    return (
      <div className="page" aria-busy="true" aria-label="Loading progress">
        <div className="skeleton" style={{ height: 96, marginBottom: 'var(--sp-4)' }} />
        <div className="skeleton" style={{ height: 96 }} />
        <div className="skeleton" style={{ height: 96 }} />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="page">
        <section className="panel panel-pad rise" role="alert">
          <p className="label">something went wrong</p>
          <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>
            We couldn't load your progress
          </h2>
          <p className="muted fs-14" style={{ marginTop: 'var(--sp-2)' }}>
            Check your connection and try again.
          </p>
          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <button className="btn btn-primary" onClick={refetch}>
              Try again
              <Icon name="rotate" size={14} />
            </button>
            <Link className="btn btn-secondary" to="/paths">
              View paths
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        trail={[{ label: 'Progress' }]}
        title="Your progress"
        sub="See how far you've come"
      />
      
      <div className="grid" style={{ gap: 'var(--sp-6)', marginBottom: 'var(--sp-4)' }}>
        <div className="column" style={{ flex: 1 }}>
          <h1 className="rise" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
            Your stats
          </h1>
          <div className="grid grid-3">
            <div className="panel panel-pad">
              <p className="label">Streak</p>
              <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
                {0} {/* This is a placeholder, we will compute the streak below */}
              </p>
            </div>
            <div className="panel panel-pad">
              <p className="label">Completion rate</p>
              <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
                {0}% {/* This is a placeholder, we will compute the completion rate below */}
              </p>
            </div>
            <div className="panel panel-pad">
              <p className="label">Modules completed</p>
              <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
                {0} {/* This is a placeholder, we will compute the modules completed below */}
                <span className="muted fs-12"> / {0}</span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="column" style={{ flex: 1 }}>
          <h1 className="rise" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
            Your paths
          </h1>
          {pathProgressData && pathProgressData.length > 0 ? (
            <div className="grid grid-2 section-gap" style={{ marginTop: 'var(--sp-4)' }}>
              {pathProgressData.map((pathData) => (
                <div key={pathData.path.id} className="panel panel-pad">
                  <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>
                    {pathData.path.title}
                  </h2>
                  <div className="mission-body">
                    {pathData.modules.map((mod) => {
                      const ms = moduleState(mod.lessonIds, progress)
                      const mp = pathCompletion(mod.lessonIds, progress)
                      const target = firstUnfinishedLesson(mod.lessonIds, progress) ?? mod.lessonIds[0]
                      return (
                        <Link
                          key={mod.id}
                          className="badge"
                          data-state={ms}
                          to={target ? `/lesson/${target}` : `/paths/${pathData.path.id}`}
                          style={getChipStyle(ms)}
                          aria-label={`${mod.title}: ${getStateLabel(ms)}, ${mp.done} of ${mp.total} lessons done`}
                        >
                          {(ms === 'completed' || ms === 'passed') && <Icon name="check" size={11} />}
                          {mod.title} · {mp.done}/{mp.total}
                        </Link>
                      )
                    })}
                  </div>
                  <Link className="btn btn-secondary btn-sm" to={`/path/${pathData.path.id}`} style={{ marginTop: 'var(--sp-4)' }}>
                    View path
                    <Icon name="arrowR" size={14} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No paths available yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper functions for chip styling and state labels
const getChipStyle = (ms: ModuleState): React.CSSProperties => {
  switch (ms) {
    case "not-started":
      return { backgroundColor: "var(--surface)", color: "var(--text)" };
    case "started":
      return { backgroundColor: "var(--primary)", color: "white" };
    case "attempted":
      return { backgroundColor: "var(--warning)", color: "white" };
    case "passed":
    case "completed":
      return { backgroundColor: "var(--success)", color: "white" };
    default:
      return { backgroundColor: "var(--surface)", color: "var(--text)" };
  }
}

const getStateLabel = (ms: ModuleState): string => {
  switch (ms) {
    case "not-started":
      return "Not started";
    case "started":
      return "Started";
    case "attempted":
      return "Attempted";
    case "passed":
      return "Passed";
    case "completed":
      return "Completed";
    default:
      return "Unknown";
  }
}