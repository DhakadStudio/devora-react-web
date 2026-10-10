import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../../lib/auth'
import { getProgressStore, useLocalProgressState } from './store'
import type { LocalProgressState } from './store'
import type { LessonStatus, ModuleState } from './types'
import { pushExerciseAttempt, pushLessonProgress, pullProgress } from './sync'

export type { LocalProgressState, RemoteProgress } from './store'
export type { LessonStatus, LessonState, ModuleState, LESSON_STATUSES } from './types'

export interface ProgressActions {
  openLesson: (lessonId: string) => void
  recordAttempt: (exerciseId: string, passed: boolean, hintsUsed: number, lessonId?: string) => void
  completeLesson: (lessonId: string) => void
  saveCode: (id: string, code: string) => void
  saveReflection: (lessonId: string, text: string) => void
  recordActivity: () => void
  resetAll: () => void
}

export function useProgress(): [LocalProgressState, ProgressActions] {
  const state = useLocalProgressState()
  const { user } = useAuth()
  const userRef = useRef(user)
  userRef.current = user
  const pulledRef = useRef<string | null>(null)
  const pullGen = useRef(0) // generation counter — increments on each user change

  useEffect(() => {
    const u = userRef.current?.id
    if (!u) {
      // User signed out — reset generation so in-flight pulls are ignored
      pullGen.current = 0
      pulledRef.current = null
      return
    }
    if (pulledRef.current === u) return // already pulled for this user ID
    pulledRef.current = u
    pullGen.current++ // new generation — protects against stale in-flight results
    const gen = pullGen.current
    pullProgress(u).then((remote) => {
      // Only merge if this pull is still the latest generation and remote exists
      if (pullGen.current === gen && remote !== null) {
        getProgressStore().mergeRemote(remote)
      }
    })
  }, [user])

  const openLesson = useCallback((lessonId: string) => {
    const store = getProgressStore()
    const before = store.getState().lessons[lessonId]
    store.openLesson(lessonId)
    const u = userRef.current
    if (u) {
      const after = store.getState().lessons[lessonId]
      pushLessonProgress(u.id, lessonId, after ?? before ?? { status: 'started' })
    }
  }, [])

  const recordAttempt = useCallback(
    (exerciseId: string, passed: boolean, hintsUsed: number, lessonId?: string) => {
      const store = getProgressStore()
      store.recordAttempt(exerciseId, passed, hintsUsed, lessonId)
      const u = userRef.current
      if (u) {
        pushExerciseAttempt(
          u.id,
          exerciseId,
          passed ? 'passed' : 'failed',
          null,
          null,
          hintsUsed
        )
        if (lessonId) {
          pushLessonProgress(u.id, lessonId, store.getState().lessons[lessonId] ?? { status: 'attempted' })
        }
      }
    },
    []
  )

  const completeLesson = useCallback((lessonId: string) => {
    const store = getProgressStore()
    store.completeLesson(lessonId)
    const u = userRef.current
    if (u) {
      const after = store.getState().lessons[lessonId]
      pushLessonProgress(u.id, lessonId, after ?? { status: 'completed' })
    }
  }, [])

  const saveCode = useCallback((id: string, code: string) => {
    getProgressStore().saveCode(id, code)
  }, [])

  const saveReflection = useCallback((lessonId: string, text: string) => {
    getProgressStore().saveReflection(lessonId, text)
  }, [])

  const recordActivity = useCallback(() => {
    getProgressStore().recordActivity()
  }, [])

  const resetAll = useCallback(() => {
    getProgressStore().resetAll()
  }, [])

  return [state, { openLesson, recordAttempt, completeLesson, saveCode, saveReflection, recordActivity, resetAll }]
}

export function moduleState(lessonIds: string[], state: LocalProgressState): ModuleState {
  let worst = 0
  let allCompleted = lessonIds.length > 0
  for (const id of lessonIds) {
    const status = (state.lessons[id]?.status ?? 'not-started') as LessonStatus
    if (status !== 'completed') allCompleted = false
    const rank = status === 'not-started' ? 0 : status === 'started' ? 1 : status === 'attempted' ? 2 : status === 'passed' ? 3 : 3
    if (rank > worst) worst = rank
  }
  if (allCompleted) return 'completed'
  if (worst >= 3) return 'passed'
  if (worst === 2) return 'attempted'
  if (worst === 1) return 'started'
  return 'not-started'
}

export function pathCompletion(
  lessonIds: string[],
  state: LocalProgressState
): { done: number; total: number; ratio: number } {
  const total = lessonIds.length
  if (!total) return { done: 0, total: 0, ratio: 0 }
  const done = lessonIds.filter((id) => {
    const s = state.lessons[id]?.status
    return s === 'passed' || s === 'completed'
  }).length
  return { done, total, ratio: done / total }
}

export function firstUnfinishedLesson(lessonIds: string[], state: LocalProgressState): string | null {
  for (const id of lessonIds) {
    if (state.lessons[id]?.status !== 'completed') return id
  }
  return null
}
