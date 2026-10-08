import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { CHALLENGES } from '../lib/curriculum'
import { useProgress, pathCompletion, firstUnfinishedLesson } from '../engines/progress'
import { ProgressBar } from '../components/JourneyChecklist'
import { getSupabase } from '../lib/supabase'
import { useContext } from 'react'
import { CurriculumContext } from '../providers/CurriculumProvider'
import {
  type PathSummary,
  type CourseSummary,
  type LessonRef
} from '../engines/curriculum'

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

export function Home() {
  const [progress] = useProgress()
  const { data: treeData, status, error, refetch } = useContext(CurriculumContext)

  const curriculumData = useMemo(() => {
    if (!treeData) return null
    const lessonMeta: Record<string, LessonMeta> = {}
    const lessonsByPath: Record<string, LessonRef[]> = {}
    const allLessonIds: string[] = []
    for (const path of treeData) {
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
    return { paths: treeData, lessonMeta, lessonsByPath, allLessonIds }
  }, [treeData])

  if (status === 'loading') {
    return (
      <div className="page">
        <PageHeader trail={[{ label: 'Home' }]} title="Continue learning" />
        <div aria-busy="true" aria-label="Loading your progress">
          <div className="skeleton" style={{ height: 96, marginBottom: 'var(--sp-4)' }} />
          <div className="grid grid-3">
            <div className="skeleton" style={{ height: 84 }} />
            <div className="skeleton" style={{ height: 84 }} />
            <div className="skeleton" style={{ height: 84 }} />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="page">
        <PageHeader trail={[{ label: 'Home' }]} title="Continue learning" />
        <section className="panel panel-pad rise" role="alert">
          <p className="label">something went wrong</p>
          <h2 style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>
            We couldn't load the curriculum
          </h2>
          <p className="muted fs-14" style={{ maxWidth: '60ch', marginTop: 'var(--sp-2)' }}>
            Check your connection and try again — your progress is safe in this browser.
          </p>
          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <button className="btn btn-primary" onClick={refetch}>
              Try again
              <Icon name="rotate" size={14} />
            </button>
            <Link className="btn btn-secondary" to="/playground">
              Just try the editor
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (!curriculumData) {
    return (
      <div className="page">
        <PageHeader trail={[{ label: 'Home' }]} title="Continue learning" />
        <div className="empty">
          <h3>Nothing to see yet</h3>
          <p>Check back later for learning paths.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader trail={[{ label: 'Home' }]} title="Continue learning" />
      {status === 'ready' && curriculumData && (
        <>
          {/* Dominant: continue card */}
          {curriculumData.lessonMeta && Object.keys(curriculumData.lessonMeta).length > 0 ? (
            <>
              {/* We have lesson data, so we can compute the next lesson */}
              {true /* This is a placeholder, we will compute the next lesson below */}
            </>
          ) : (
            <>
              {/* We don't have lesson data, so we show the start here message */}
              {true /* This is a placeholder, we will compute the next lesson below */}
            </>
          )}
          {/* Stats strip */}
          <section className="grid grid-3 section-gap">
            <div className="panel panel-pad">
              <p className="label">lessons done</p>
              <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
                {0} {/* This is a placeholder, we will compute the done count below */}
                <span className="muted fs-12"> / {0}</span>
              </p>
            </div>
            <div className="panel panel-pad">
              <p className="label">days active</p>
              <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
                {0} {/* This is a placeholder, we will compute the days active below */}
              </p>
            </div>
            <div className="panel panel-pad">
              <p className="label">challenges solved</p>
              <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
                {0} {/* This is a placeholder, we will compute the challenges solved below */}
                <span className="muted fs-12"> / {CHALLENGES.length}</span>
              </p>
            </div>
          </section>

          {/* Next up */}
          {true /* This is a placeholder, we will compute the next lesson below */}

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