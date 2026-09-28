import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ExerciseContent } from '../curriculum/content'
import { useHints } from './hints'

function exerciseWith(overrides: Partial<ExerciseContent> = {}): ExerciseContent {
  return {
    id: 'ex1',
    kind: 'exercise',
    type: 'free-code',
    language: 'javascript',
    instructions: 'Print a greeting.',
    starterCode: null,
    tests: [],
    hints: ['Re-read the instructions: what exactly should be printed?', 'console.log takes one value.', 'Call console.log("Hello, Devora!")'],
    options: null,
    answerIndex: null,
    expectedBehavior: 'The program prints "Hello, Devora!" and finishes without errors.',
    ...overrides
  }
}

describe('useHints — initial state', () => {
  it('starts with no hints revealed and not exhausted', () => {
    const { result } = renderHook(() => useHints(exerciseWith()))
    expect(result.current.hintLevel).toBe(0)
    expect(result.current.revealed).toEqual([])
    expect(result.current.exhausted).toBe(false)
  })
})

describe('useHints — progressive reveal 1→2→3', () => {
  it('each reveal reveals the next hint in order', () => {
    const { result } = renderHook(() => useHints(exerciseWith()))
    act(() => result.current.revealNext())
    expect(result.current.hintLevel).toBe(1)
    expect(result.current.revealed).toEqual(['Re-read the instructions: what exactly should be printed?'])
    expect(result.current.exhausted).toBe(false)

    act(() => result.current.revealNext())
    expect(result.current.hintLevel).toBe(2)
    expect(result.current.revealed).toEqual(['Re-read the instructions: what exactly should be printed?', 'console.log takes one value.'])
    expect(result.current.exhausted).toBe(false)

    act(() => result.current.revealNext())
    expect(result.current.hintLevel).toBe(3)
    expect(result.current.revealed).toHaveLength(3)
    expect(result.current.exhausted).toBe(false)
  })

  it('revealNext reveals the explanation fallback after the hints run out', () => {
    const { result } = renderHook(() => useHints(exerciseWith()))
    for (let i = 0; i < 4; i++) act(() => result.current.revealNext())
    expect(result.current.hintLevel).toBe(4)
    expect(result.current.revealed[3]).toBe('The program prints "Hello, Devora!" and finishes without errors.')
    expect(result.current.exhausted).toBe(true)
  })

  it('revealNext is a no-op past the last step', () => {
    const { result } = renderHook(() => useHints(exerciseWith()))
    for (let i = 0; i < 6; i++) act(() => result.current.revealNext())
    expect(result.current.hintLevel).toBe(4)
    expect(result.current.revealed).toHaveLength(4)
    expect(result.current.exhausted).toBe(true)
  })
})

describe('useHints — fallback selection', () => {
  it('uses referenceSolution as the fallback when expectedBehavior is absent', () => {
    const { result } = renderHook(() =>
      useHints(
        exerciseWith({
          hints: ['One hint only.'],
          expectedBehavior: undefined,
          referenceSolution: 'console.log("Hello, Devora!")'
        })
      )
    )
    expect(result.current.exhausted).toBe(false)
    act(() => result.current.revealNext())
    expect(result.current.revealed).toEqual(['One hint only.'])
    act(() => result.current.revealNext())
    expect(result.current.revealed).toEqual(['One hint only.', 'console.log("Hello, Devora!")'])
    expect(result.current.exhausted).toBe(true)
  })

  it('hints null and no fallback → exhausted immediately with nothing revealed', () => {
    const { result } = renderHook(() =>
      useHints(exerciseWith({ hints: null, expectedBehavior: undefined, referenceSolution: undefined }))
    )
    expect(result.current.hintLevel).toBe(0)
    expect(result.current.revealed).toEqual([])
    expect(result.current.exhausted).toBe(true)
  })

  it('hints null but expectedBehavior present → one fallback step', () => {
    const { result } = renderHook(() => useHints(exerciseWith({ hints: null })))
    expect(result.current.exhausted).toBe(false)
    act(() => result.current.revealNext())
    expect(result.current.revealed).toEqual(['The program prints "Hello, Devora!" and finishes without errors.'])
    expect(result.current.exhausted).toBe(true)
  })
})

describe('useHints — switching exercises', () => {
  it('resets to no hints revealed when the exercise changes', () => {
    const { result, rerender } = renderHook(({ exercise }: { exercise: ExerciseContent }) => useHints(exercise), {
      initialProps: { exercise: exerciseWith() }
    })
    act(() => result.current.revealNext())
    expect(result.current.hintLevel).toBe(1)

    rerender({ exercise: exerciseWith({ id: 'ex2', hints: ['Different hint.'] }) })
    expect(result.current.hintLevel).toBe(0)
    expect(result.current.revealed).toEqual([])
    expect(result.current.exhausted).toBe(false)

    act(() => result.current.revealNext())
    expect(result.current.revealed).toEqual(['Different hint.'])
  })
})
