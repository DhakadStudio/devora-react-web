import { describe, it, expect, beforeEach, vi } from 'vitest'

const upsertMock = vi.fn((): { error: { message: string } | null } => ({ error: null }))
const insertMock = vi.fn((): { error: { message: string } | null } => ({ error: null }))

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    from: (table: string) => {
      if (table === 'lesson_progress') return { upsert: upsertMock }
      if (table === 'exercise_attempts') return { insert: insertMock }
      return {}
    }
  })
}))

import { pushLessonProgress, pushExerciseAttempt } from './sync'

const UID = '11111111-1111-1111-1111-111111111111'
const LESSON = 'javascript-fundamentals/core/foundations/values-and-output'
const EX = 'javascript-fundamentals/core/foundations/values-and-output/ex-1'

describe('pushLessonProgress', () => {
  beforeEach(() => {
    upsertMock.mockClear()
    insertMock.mockClear()
  })

  it('upserts status + timestamps keyed by (user_id, lesson_id)', async () => {
    await pushLessonProgress(UID, LESSON, { status: 'passed', startedAt: '2026-09-01T00:00:00.000Z' })
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: UID,
        lesson_id: LESSON,
        status: 'passed',
        started_at: '2026-09-01T00:00:00.000Z',
        completed_at: null
      }),
      { onConflict: 'user_id,lesson_id' }
    )
  })

  it('never throws when the DB write fails', async () => {
    upsertMock.mockImplementationOnce(() => ({ error: { message: 'rls denied' } }))
    await expect(pushLessonProgress(UID, LESSON, { status: 'started' })).resolves.toBeUndefined()
  })
})

describe('pushExerciseAttempt', () => {
  beforeEach(() => {
    upsertMock.mockClear()
    insertMock.mockClear()
  })

  it('inserts one append-only row per submission with hints_used', async () => {
    await pushExerciseAttempt(UID, EX, 'passed', 'let x = 1', null, 2)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: UID,
        exercise_id: EX,
        status: 'passed',
        submitted_code: 'let x = 1',
        selected_option_index: null,
        hints_used: 2
      })
    )
  })

  it('inserts selected_option_index for multiple-choice (code null)', async () => {
    await pushExerciseAttempt(UID, EX, 'failed', null, 0, 0)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        submitted_code: null,
        selected_option_index: 0
      })
    )
  })

  it('never throws when the DB write fails', async () => {
    insertMock.mockImplementationOnce(() => ({ error: { message: 'rls denied' } }))
    await expect(pushExerciseAttempt(UID, EX, 'failed', 'x', null, 0)).resolves.toBeUndefined()
  })
})

describe('pullProgress', () => {
  it('returns null when supabase is not configured — never throws', async () => {
    vi.doMock('../../lib/supabase', () => ({
      getSupabase: () => null
    }))
    vi.resetModules()
    const { pullProgress: freshPull } = await import('./sync')
    await expect(freshPull(UID)).resolves.toBeNull()
  })

  it('returns null when the DB query throws — never throws', async () => {
    vi.doMock('../../lib/supabase', () => ({
      getSupabase: () => {
        throw new Error('network down')
      }
    }))
    vi.resetModules()
    const { pullProgress: freshPull } = await import('./sync')
    await expect(freshPull(UID)).resolves.toBeNull()
  })
})
