import type { Database } from '../../lib/types/db.generated'
import { getSupabase } from '../../lib/supabase'
import type { LessonState } from './types'
import type { RemoteProgress } from './store'

type LessonProgressRow = Database['public']['Tables']['lesson_progress']['Insert']

export async function pushLessonProgress(
  userId: string,
  lessonId: string,
  s: LessonState
): Promise<void> {
  const client = getSupabase()
  if (!client) return
  const row: LessonProgressRow = {
    user_id: userId,
    lesson_id: lessonId,
    status: s.status,
    started_at: s.startedAt ?? null,
    completed_at: s.completedAt ?? null
  }
  try {
    const { error } = await client
      .from('lesson_progress')
      .upsert(row, { onConflict: 'user_id,lesson_id' })
    if (error) return
  } catch {
    return
  }
}

type ExerciseAttemptRow = Database['public']['Tables']['exercise_attempts']['Insert']

export async function pushExerciseAttempt(
  userId: string,
  exerciseId: string,
  status: 'attempted' | 'passed' | 'failed',
  submittedCode: string | null,
  selectedOptionIndex: number | null,
  hintsUsed: number
): Promise<void> {
  const client = getSupabase()
  if (!client) return
  const row: ExerciseAttemptRow = {
    user_id: userId,
    exercise_id: exerciseId,
    status,
    submitted_code: submittedCode,
    selected_option_index: selectedOptionIndex,
    hints_used: hintsUsed
  }
  try {
    const { error } = await client.from('exercise_attempts').insert(row)
    if (error) return
  } catch {
    return
  }
}

export async function pullProgress(userId: string): Promise<RemoteProgress | null> {
  try {
    const client = getSupabase()
    if (!client) return null
    const { data: progressRows, error } = await client
      .from('lesson_progress')
      .select('lesson_id, status, started_at, completed_at')
      .eq('user_id', userId)
    if (error) return null

    const { data: attemptRows, error: attemptError } = await client
      .from('exercise_attempts')
      .select('exercise_id, hints_used')
      .eq('user_id', userId)
    if (attemptError) return null

    const lessons: Record<string, LessonState> = {}
    for (const row of progressRows ?? []) {
      const status = row.status
      if (status === 'not-started') continue
      lessons[row.lesson_id] = {
        status,
        startedAt: row.started_at ?? undefined,
        completedAt: row.completed_at ?? undefined
      }
    }

    const hints: Record<string, number> = {}
    for (const row of attemptRows ?? []) {
      hints[row.exercise_id] = Math.max(hints[row.exercise_id] ?? 0, row.hints_used ?? 0)
    }

    return { lessons, hints }
  } catch {
    return null
  }
}
