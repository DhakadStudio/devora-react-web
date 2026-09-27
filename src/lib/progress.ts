import { useCallback, useSyncExternalStore } from 'react'
import { PATHS, CHALLENGES } from './curriculum'

export interface ProgressState {
  completed: Record<string, string> // lessonId → finishedISO
  hintsUsed: Record<string, number> // lessonId → count
  code: Record<string, string> // lessonId → latest code
  activity: Record<string, number> // dateISO → lessons finished that day
  reflections: Record<string, string> // lessonId → reflect answer
}

const KEY = 'devora-react-progress'

const EMPTY: ProgressState = {
  completed: {},
  hintsUsed: {},
  code: {},
  activity: {},
  reflections: {}
}

let state: ProgressState = EMPTY
const listeners = new Set<() => void>()

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch {}
  return EMPTY
}

let lastPersistFailed = false

function persist(): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    lastPersistFailed = false
    return true
  } catch {
    lastPersistFailed = true
    return false
  }
}

function emit() {
  persist()
  listeners.forEach((l) => l())
}

/** True when the last write to localStorage failed ("data not saved" state). */
export function progressPersistFailed() {
  return lastPersistFailed
}

state = load()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return state
}

export function useProgress(): [
  ProgressState,
  {
    completeLesson: (id: string) => void
    saveCode: (id: string, code: string) => void
    addHintUsed: (id: string) => void
    saveReflection: (id: string, text: string) => void
    resetAll: () => void
    /** count any coding action (run, save) toward the consistency graph */
    recordActivity: () => void
  }
] {
  const snap = useSyncExternalStore(subscribe, getSnapshot)

  const completeLesson = useCallback((id: string) => {
    if (state.completed[id]) return
    const today = new Date().toISOString().slice(0, 10)
    state = {
      ...state,
      completed: { ...state.completed, [id]: new Date().toISOString() },
      activity: { ...state.activity, [today]: (state.activity[today] ?? 0) + 1 }
    }
    emit()
  }, [])

  const saveCode = useCallback((id: string, code: string) => {
    state = { ...state, code: { ...state.code, [id]: code } }
    emit()
  }, [])

  const addHintUsed = useCallback((id: string) => {
    state = { ...state, hintsUsed: { ...state.hintsUsed, [id]: (state.hintsUsed[id] ?? 0) + 1 } }
    emit()
  }, [])

  const saveReflection = useCallback((id: string, text: string) => {
    state = { ...state, reflections: { ...state.reflections, [id]: text } }
    emit()
  }, [])

  const resetAll = useCallback(() => {
    state = { ...EMPTY }
    emit()
  }, [])

  const recordActivity = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    state = { ...state, activity: { ...state.activity, [today]: (state.activity[today] ?? 0) + 1 } }
    emit()
  }, [])

  return [snap, { completeLesson, saveCode, addHintUsed, saveReflection, resetAll, recordActivity }]
}

/* ---------- derived selectors ---------- */

export function isCompleted(s: ProgressState, lessonId: string) {
  return Boolean(s.completed[lessonId])
}

export function firstUnfinishedLesson(s: ProgressState) {
  for (const p of PATHS) for (const l of p.lessons) if (!s.completed[l.id]) return { path: p, lesson: l }
  return null
}

export function weakestSkill(s: ProgressState): string | null {
  const totals = new Map<string, number>()
  const done = new Map<string, number>()
  for (const p of PATHS)
    for (const l of p.lessons) {
      totals.set(l.skill, (totals.get(l.skill) ?? 0) + 1)
      if (s.completed[l.id]) done.set(l.skill, (done.get(l.skill) ?? 0) + 1)
    }
  let worst: string | null = null
  let worstRatio = Infinity
  for (const [skill, total] of totals) {
    const ratio = (done.get(skill) ?? 0) / total
    if (ratio < worstRatio) {
      worstRatio = ratio
      worst = skill
    }
  }
  return worst
}

export function pathCompletion(s: ProgressState, pathId: string) {
  const p = PATHS.find((x) => x.id === pathId)
  if (!p) return { done: 0, total: 0, ratio: 0 }
  const done = p.lessons.filter((l) => s.completed[l.id]).length
  return { done, total: p.lessons.length, ratio: p.lessons.length ? done / p.lessons.length : 0 }
}

export function challengeCompletion(s: ProgressState, id: string) {
  return Boolean(s.completed[id])
}

export function skillChecklist(s: ProgressState, pathId: string) {
  const p = PATHS.find((x) => x.id === pathId)
  if (!p) return []
  const bySkill = new Map<string, { total: number; done: number }>()
  for (const l of p.lessons) {
    const row = bySkill.get(l.skill) ?? { total: 0, done: 0 }
    row.total += 1
    if (s.completed[l.id]) row.done += 1
    bySkill.set(l.skill, row)
  }
  return Array.from(bySkill, ([skill, v]) => ({
    skill,
    done: v.done,
    total: v.total,
    status: v.done === v.total ? 'done' : v.done > 0 ? 'current' : 'todo'
  }))
}

export function streakDays(s: ProgressState): number {
  const dates = new Set(Object.keys(s.activity))
  let streak = 0
  const d = new Date()
  if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak += 1
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export const ALL_LESSONS_COUNT = PATHS.reduce((n, p) => n + p.lessons.length, 0)
export const ALL_CHALLENGES_COUNT = CHALLENGES.length
