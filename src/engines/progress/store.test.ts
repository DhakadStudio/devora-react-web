import { describe, it, expect } from 'vitest'
import { createLocalStore, loadState } from './store'
import type { ProgressStore } from './store'

const LESSON = 'javascript-fundamentals/core/foundations/values-and-output'
const EX = 'javascript-fundamentals/core/foundations/values-and-output/ex-1'

function freshStore(): ProgressStore {
  localStorage.clear()
  return createLocalStore()
}

describe('progress store — enum transitions', () => {
  it('openLesson moves not-started → started and sets startedAt', () => {
    const s = freshStore()
    s.openLesson(LESSON)
    expect(s.getState().lessons[LESSON]).toMatchObject({ status: 'started' })
    expect(s.getState().lessons[LESSON].startedAt).toBeTruthy()
    expect(s.getState().lessons[LESSON].completedAt).toBeUndefined()
  })

  it('openLesson never downgrades an already-passed lesson', () => {
    const s = freshStore()
    s.recordAttempt(EX, true, 0, LESSON)
    const before = s.getState().lessons[LESSON]
    s.openLesson(LESSON)
    expect(s.getState().lessons[LESSON]).toEqual(before)
  })

  it('recordAttempt with failed moves lesson to attempted when not passed', () => {
    const s = freshStore()
    s.openLesson(LESSON)
    s.recordAttempt(EX, false, 2, LESSON)
    expect(s.getState().lessons[LESSON]).toMatchObject({ status: 'attempted' })
    expect(s.getState().hints[EX]).toBe(2)
  })

  it('recordAttempt with passed moves lesson to passed', () => {
    const s = freshStore()
    s.openLesson(LESSON)
    s.recordAttempt(EX, true, 1, LESSON)
    expect(s.getState().lessons[LESSON]).toMatchObject({ status: 'passed' })
  })

  it('recordAttempt never downgrades passed/completed lessons', () => {
    const s = freshStore()
    s.recordAttempt(EX, true, 0, LESSON)
    s.recordAttempt(EX, false, 0, LESSON)
    expect(s.getState().lessons[LESSON]).toMatchObject({ status: 'passed' })
  })

  it('completeLesson from not-started sets both timestamps', () => {
    const s = freshStore()
    s.completeLesson(LESSON)
    const st = s.getState().lessons[LESSON]
    expect(st).toMatchObject({ status: 'completed' })
    expect(st.startedAt).toBeTruthy()
    expect(st.completedAt).toBeTruthy()
  })

  it('completeLesson after passed sets completedAt and keeps startedAt', () => {
    const s = freshStore()
    s.openLesson(LESSON)
    s.recordAttempt(EX, true, 0, LESSON)
    const startedAt = s.getState().lessons[LESSON].startedAt
    s.completeLesson(LESSON)
    const st = s.getState().lessons[LESSON]
    expect(st).toMatchObject({ status: 'completed' })
    expect(st.startedAt).toBe(startedAt)
    expect(st.completedAt).toBeTruthy()
  })
})

describe('progress store — persistence and other mutations', () => {
  it('saveCode and saveReflection store values', () => {
    const s = freshStore()
    s.saveCode(EX, 'let x = 1')
    s.saveReflection(LESSON, 'it prints values')
    expect(s.getState().code[EX]).toBe('let x = 1')
    expect(s.getState().reflections[LESSON]).toBe('it prints values')
  })

  it('state persists to localStorage and reloads', () => {
    const s = freshStore()
    s.openLesson(LESSON)
    const reloaded = loadState()
    expect(reloaded.lessons[LESSON]).toMatchObject({ status: 'started' })
  })

  it('migrates the legacy boolean-completed shape on load', () => {
    localStorage.clear()
    localStorage.setItem('devora-react-progress', JSON.stringify({
      completed: { [LESSON]: '2026-09-01T10:00:00.000Z' },
      hintsUsed: { [EX]: 3 },
      code: { [EX]: 'console.log(1)' },
      activity: { '2026-09-01': 2 },
      reflections: { [LESSON]: 'old reflection' }
    }))
    const migrated = loadState()
    expect(migrated.lessons[LESSON]).toEqual({
      status: 'completed',
      startedAt: '2026-09-01T10:00:00.000Z',
      completedAt: '2026-09-01T10:00:00.000Z'
    })
    expect(migrated.hints[EX]).toBe(3)
    expect(migrated.code[EX]).toBe('console.log(1)')
    expect(migrated.activity['2026-09-01']).toBe(2)
    expect(migrated.reflections[LESSON]).toBe('old reflection')
  })

  it('recordActivity counts coding actions per day', () => {
    const s = freshStore()
    s.recordActivity()
    s.recordActivity()
    const today = new Date().toISOString().slice(0, 10)
    expect(s.getState().activity[today]).toBe(2)
  })

  it('resetAll returns to the empty state', () => {
    const s = freshStore()
    s.openLesson(LESSON)
    s.resetAll()
    expect(s.getState().lessons).toEqual({})
  })

  it('mergeRemote: later timestamp wins, DB fills gaps', () => {
    const s = freshStore()
    s.openLesson(LESSON)
    const localTime = s.getState().lessons[LESSON].startedAt!

    s.mergeRemote({
      lessons: {
        [LESSON]: { status: 'completed', startedAt: localTime, completedAt: '2027-01-01T00:00:00.000Z' },
        'javascript-fundamentals/core/foundations/variables': { status: 'passed', startedAt: '2026-09-01T00:00:00.000Z' }
      },
      hints: {}
    })

    expect(s.getState().lessons[LESSON]).toMatchObject({ status: 'completed' })
    expect(s.getState().lessons['javascript-fundamentals/core/foundations/variables']).toMatchObject({ status: 'passed' })
  })

  it('mergeRemote: local newer state wins over older remote', () => {
    const s = freshStore()
    s.recordAttempt(EX, true, 0, LESSON)
    const st = s.getState().lessons[LESSON]

    s.mergeRemote({
      lessons: {
        [LESSON]: { status: 'started', startedAt: '2020-01-01T00:00:00.000Z' }
      },
      hints: {}
    })

    expect(s.getState().lessons[LESSON]).toEqual(st)
  })

  it('mergeRemote never wipes completed remote lessons with an empty local', () => {
    const s = freshStore()
    s.mergeRemote({
      lessons: {
        [LESSON]: { status: 'completed', startedAt: '2026-09-01T00:00:00.000Z', completedAt: '2026-09-01T01:00:00.000Z' }
      },
      hints: { [EX]: 1 }
    })
    expect(s.getState().lessons[LESSON]).toMatchObject({ status: 'completed' })
    expect(s.getState().hints[EX]).toBe(1)
  })
})
