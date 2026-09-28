import { describe, it, expect } from 'vitest'
import type { ExerciseContent } from '../curriculum/content'
import { gradeMultipleChoice } from './mc'

function mcExercise(overrides: Partial<ExerciseContent> = {}): ExerciseContent {
  return {
    id: 'ex-mc',
    kind: 'exercise',
    type: 'multiple-choice',
    language: null,
    instructions: 'Which function prints a line of output?',
    starterCode: null,
    tests: [],
    hints: null,
    options: ['console.log', 'Math.round', 'String'],
    answerIndex: 0,
    ...overrides
  }
}

describe('gradeMultipleChoice', () => {
  it('correct index → true', () => {
    expect(gradeMultipleChoice(mcExercise(), 0)).toBe(true)
  })

  it('wrong index → false', () => {
    expect(gradeMultipleChoice(mcExercise(), 1)).toBe(false)
    expect(gradeMultipleChoice(mcExercise(), 2)).toBe(false)
  })

  it('null selection → false', () => {
    expect(gradeMultipleChoice(mcExercise(), null)).toBe(false)
  })

  it('null answerIndex (malformed exercise) → false', () => {
    expect(gradeMultipleChoice(mcExercise({ answerIndex: null }), 0)).toBe(false)
    expect(gradeMultipleChoice(mcExercise({ answerIndex: null }), null)).toBe(false)
  })
})
