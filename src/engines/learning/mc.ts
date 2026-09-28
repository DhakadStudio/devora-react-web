import type { ExerciseContent } from '../curriculum/content'

export function gradeMultipleChoice(exercise: ExerciseContent, selectedIndex: number | null): boolean {
  if (exercise.answerIndex === null) return false
  return selectedIndex === exercise.answerIndex
}
