import { useSyncExternalStore } from 'react'
import type { LessonState } from './types'
import { statusRank } from './types'

export type { LessonState } from './types'

export interface LocalProgressState {
  lessons: Record<string, LessonState>
  code: Record<string, string>
  hints: Record<string, number>
  activity: Record<string, number>
  reflections: Record<string, string>
  lastLessonId?: string
}

export interface RemoteProgress {
  lessons: Record<string, LessonState>
  hints: Record<string, number>
}

const KEY = 'devora-react-progress'

const EMPTY: LocalProgressState = {
  lessons: {},
  code: {},
  hints: {},
  activity: {},
  reflections: {}
}

interface LegacyShape {
  completed?: Record<string, string>
  hintsUsed?: Record<string, number>
  code?: Record<string, string>
  activity?: Record<string, number>
  reflections?: Record<string, string>
}

function migrateLegacy(raw: LegacyShape): LocalProgressState {
  const state: LocalProgressState = {
    lessons: {},
    code: raw.code ?? {},
    hints: raw.hintsUsed ?? {},
    activity: raw.activity ?? {},
    reflections: raw.reflections ?? {}
  }
  for (const [lessonId, iso] of Object.entries(raw.completed ?? {})) {
    state.lessons[lessonId] = { status: 'completed', startedAt: iso, completedAt: iso }
  }
  return state
}

export function loadState(): LocalProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as LegacyShape & LocalProgressState
    if (parsed.lessons && typeof parsed.lessons === 'object') {
      return { ...EMPTY, ...parsed }
    }
    return migrateLegacy(parsed)
  } catch {
    return { ...EMPTY }
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface ProgressStore {
  getState(): LocalProgressState
  subscribe(cb: () => void): () => void
  openLesson(lessonId: string): void
  recordAttempt(exerciseId: string, passed: boolean, hintsUsed: number, lessonId?: string): void
  completeLesson(lessonId: string): void
  saveCode(id: string, code: string): void
  saveReflection(lessonId: string, text: string): void
  recordActivity(): void
  resetAll(): void
  mergeRemote(remote: RemoteProgress): void
}

export function createLocalStore(): ProgressStore {
  let state: LocalProgressState = loadState()
  const listeners = new Set<() => void>()

  function emit() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {}
    listeners.forEach((l) => l())
  }

  function setLesson(lessonId: string, next: LessonState) {
    state = {
      ...state,
      lessons: { ...state.lessons, [lessonId]: next },
      lastLessonId: lessonId
    }
  }

  return {
    getState: () => state,
    subscribe(cb: () => void) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },

    openLesson(lessonId) {
      const current = state.lessons[lessonId]
      if (current && statusRank(current.status) >= statusRank('started')) {
        setLesson(lessonId, current)
        emit()
        return
      }
      setLesson(lessonId, { status: 'started', startedAt: new Date().toISOString() })
      emit()
    },

    recordAttempt(exerciseId, passed, hintsUsed, lessonId) {
      state = {
        ...state,
        hints: { ...state.hints, [exerciseId]: (state.hints[exerciseId] ?? 0) + hintsUsed }
      }
      if (lessonId) {
        const current = state.lessons[lessonId] ?? { status: 'started', startedAt: new Date().toISOString() }
        if (statusRank(current.status) < statusRank('passed')) {
          setLesson(lessonId, { ...current, status: passed ? 'passed' : 'attempted' })
        }
      }
      emit()
    },

    completeLesson(lessonId) {
      const current = state.lessons[lessonId]
      if (current?.status === 'completed') return
      const now = new Date().toISOString()
      setLesson(lessonId, {
        status: 'completed',
        startedAt: current?.startedAt ?? now,
        completedAt: now
      })
      emit()
    },

    saveCode(id, code) {
      state = { ...state, code: { ...state.code, [id]: code } }
      emit()
    },

    saveReflection(lessonId, text) {
      state = { ...state, reflections: { ...state.reflections, [lessonId]: text } }
      emit()
    },

    recordActivity() {
      const t = today()
      state = { ...state, activity: { ...state.activity, [t]: (state.activity[t] ?? 0) + 1 } }
      emit()
    },

    resetAll() {
      state = { ...EMPTY }
      emit()
    },

    mergeRemote(remote) {
      const lessons = { ...state.lessons }
      for (const [lessonId, remoteState] of Object.entries(remote.lessons)) {
        const local = lessons[lessonId]
        if (!local) {
          lessons[lessonId] = remoteState
          continue
        }
        const localTime = local.completedAt ?? local.startedAt ?? ''
        const remoteTime = remoteState.completedAt ?? remoteState.startedAt ?? ''
        lessons[lessonId] = remoteTime > localTime ? remoteState : local
      }
      const hints = { ...state.hints }
      for (const [exerciseId, count] of Object.entries(remote.hints)) {
        hints[exerciseId] = Math.max(hints[exerciseId] ?? 0, count)
      }
      state = { ...state, lessons, hints }
      emit()
    }
  }
}

let sharedStore: ProgressStore | null = null

export function getProgressStore(): ProgressStore {
  if (!sharedStore) sharedStore = createLocalStore()
  return sharedStore
}

export function useLocalProgressState(): LocalProgressState {
  const store = getProgressStore()
  return useSyncExternalStore(store.subscribe, store.getState)
}
