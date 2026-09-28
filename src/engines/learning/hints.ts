import { useCallback, useState } from 'react'
import type { ExerciseContent } from '../curriculum/content'

export interface HintsState {
  hintLevel: number
  revealed: string[]
  revealNext: () => void
  exhausted: boolean
}

export function useHints(exercise: ExerciseContent): HintsState {
  const hints = exercise.hints ?? []
  const fallback = exercise.expectedBehavior ?? exercise.referenceSolution
  const steps = fallback !== undefined ? [...hints, fallback] : hints
  const lastLevel = steps.length

  const [state, setState] = useState<{ id: string; level: number }>({ id: exercise.id, level: 0 })
  if (state.id !== exercise.id) setState({ id: exercise.id, level: 0 })
  const level = state.id === exercise.id ? state.level : 0

  const revealNext = useCallback(() => {
    setState((prev) => (prev.level >= lastLevel ? prev : { ...prev, level: prev.level + 1 }))
  }, [lastLevel])

  return {
    hintLevel: level,
    revealed: steps.slice(0, level),
    revealNext,
    exhausted: level >= lastLevel
  }
}
