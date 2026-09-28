import { describe, it, expect } from 'vitest'
import { moduleState, pathCompletion, firstUnfinishedLesson } from './index'
import type { LocalProgressState } from './store'

const L1 = 'javascript-fundamentals/core/foundations/values-and-output'
const L2 = 'javascript-fundamentals/core/foundations/variables'
const L3 = 'javascript-fundamentals/core/foundations/conditionals'
const MODULE_LESSONS = [L1, L2, L3]

function stateWith(lessons: LocalProgressState['lessons']): LocalProgressState {
  return { lessons, code: {}, hints: {}, activity: {}, reflections: {} }
}

describe('moduleState derivation', () => {
  it('empty lessonIds → not-started', () => {
    expect(moduleState([], stateWith({}))).toBe('not-started')
  })

  it('no lessons started → not-started', () => {
    expect(moduleState(MODULE_LESSONS, stateWith({}))).toBe('not-started')
  })

  it('any started → started', () => {
    expect(moduleState(MODULE_LESSONS, stateWith({
      [L1]: { status: 'started', startedAt: '2026-09-01T00:00:00.000Z' }
    }))).toBe('started')
  })

  it('any attempted (no passed) → attempted', () => {
    expect(moduleState(MODULE_LESSONS, stateWith({
      [L1]: { status: 'attempted', startedAt: '2026-09-01T00:00:00.000Z' },
      [L2]: { status: 'started', startedAt: '2026-09-01T00:00:00.000Z' }
    }))).toBe('attempted')
  })

  it('any passed (no completed) → passed', () => {
    expect(moduleState(MODULE_LESSONS, stateWith({
      [L1]: { status: 'passed', startedAt: '2026-09-01T00:00:00.000Z' },
      [L2]: { status: 'started', startedAt: '2026-09-01T00:00:00.000Z' }
    }))).toBe('passed')
  })

  it('all completed → completed', () => {
    const all: LocalProgressState['lessons'] = {}
    for (const l of MODULE_LESSONS) all[l] = { status: 'completed', startedAt: '2026-09-01T00:00:00.000Z', completedAt: '2026-09-02T00:00:00.000Z' }
    expect(moduleState(MODULE_LESSONS, stateWith(all))).toBe('completed')
  })
})

describe('pathCompletion', () => {
  it('counts passed/completed lessons only', () => {
    const s = stateWith({
      [L1]: { status: 'completed', startedAt: '2026-09-01T00:00:00.000Z', completedAt: '2026-09-02T00:00:00.000Z' },
      [L2]: { status: 'passed', startedAt: '2026-09-01T00:00:00.000Z' },
      [L3]: { status: 'started', startedAt: '2026-09-01T00:00:00.000Z' }
    })
    expect(pathCompletion(MODULE_LESSONS, s)).toEqual({ done: 2, total: 3, ratio: 2 / 3 })
  })

  it('empty module → zero ratio without divide-by-zero', () => {
    expect(pathCompletion([], stateWith({}))).toEqual({ done: 0, total: 0, ratio: 0 })
  })
})

describe('firstUnfinishedLesson', () => {
  it('returns the first lesson whose status is not completed', () => {
    const s = stateWith({
      [L1]: { status: 'completed', startedAt: '2026-09-01T00:00:00.000Z', completedAt: '2026-09-02T00:00:00.000Z' },
      [L2]: { status: 'passed', startedAt: '2026-09-01T00:00:00.000Z' }
    })
    expect(firstUnfinishedLesson(MODULE_LESSONS, s)).toBe(L2)
  })

  it('returns null when every lesson is completed', () => {
    const all: LocalProgressState['lessons'] = {}
    for (const l of MODULE_LESSONS) all[l] = { status: 'completed', startedAt: '2026-09-01T00:00:00.000Z', completedAt: '2026-09-02T00:00:00.000Z' }
    expect(firstUnfinishedLesson(MODULE_LESSONS, stateWith(all))).toBeNull()
  })

  it('returns the first lesson when nothing is started', () => {
    expect(firstUnfinishedLesson(MODULE_LESSONS, stateWith({}))).toBe(L1)
  })
})
