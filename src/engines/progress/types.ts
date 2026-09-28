export const LESSON_STATUSES = ['not-started', 'started', 'attempted', 'passed', 'completed'] as const
export type LessonStatus = (typeof LESSON_STATUSES)[number]
export type ModuleState = 'not-started' | 'started' | 'attempted' | 'passed' | 'completed'

export interface LessonState {
  status: LessonStatus
  startedAt?: string
  completedAt?: string
}

const STATUS_RANK: Record<LessonStatus, number> = {
  'not-started': 0,
  started: 1,
  attempted: 2,
  passed: 3,
  completed: 4
}

export function statusRank(s: LessonStatus): number {
  return STATUS_RANK[s]
}
