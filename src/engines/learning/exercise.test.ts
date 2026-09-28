import { describe, it, expect, vi } from 'vitest'
import type { ExecResult } from '../execution'
import type { ExerciseContent } from '../curriculum/content'
import { runExercise, normalizeOutput } from './exercise'

function okResult(stdout: string): ExecResult {
  return { status: 'ok', stdout, stderr: '' }
}

function errorResult(status: ExecResult['status'], message: string): ExecResult {
  return {
    status,
    stdout: '',
    stderr: message,
    error: { message, expected: 'the program to run cleanly', nextStep: 'Fix the problem and run again.' }
  }
}

function exerciseWith(tests: ExerciseContent['tests'], overrides: Partial<ExerciseContent> = {}): ExerciseContent {
  return {
    id: 'ex1',
    kind: 'exercise',
    type: 'free-code',
    language: 'javascript',
    instructions: 'Print a greeting.',
    starterCode: null,
    tests,
    hints: null,
    options: null,
    answerIndex: null,
    ...overrides
  }
}

type RunReq = { language: string; code: string; stdin?: string }

function runCodeReturning(stdoutFor: (stdin: string) => string) {
  return vi.fn(async (req: RunReq) => okResult(stdoutFor(req.stdin ?? '')))
}

const greetCode = 'console.log("Hello, Devora!")'

describe('runExercise — per-case pass/fail', () => {
  it('all test cases pass → each passed, allPassed true', async () => {
    const runCode = runCodeReturning(() => 'Hello, Devora!')
    const result = await runExercise(
      exerciseWith([
        { kind: 'exercise-test', description: 'prints the greeting', stdin: '', expectedOutput: 'Hello, Devora!' },
        { kind: 'exercise-test', description: 'prints it again for n=1', stdin: '1', expectedOutput: 'Hello, Devora!' }
      ]),
      greetCode,
      runCode
    )
    expect(result.testResults).toHaveLength(2)
    expect(result.testResults[0]).toMatchObject({
      description: 'prints the greeting',
      stdin: '',
      expectedOutput: 'Hello, Devora!',
      actualOutput: 'Hello, Devora!',
      passed: true
    })
    expect(result.testResults[1]?.passed).toBe(true)
    expect(result.allPassed).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('one failing case → that case failed, allPassed false', async () => {
    const runCode = runCodeReturning((stdin) => (stdin === '' ? 'Hello, Devora!' : 'wrong output'))
    const result = await runExercise(
      exerciseWith([
        { kind: 'exercise-test', description: 'prints the greeting', stdin: '', expectedOutput: 'Hello, Devora!' },
        { kind: 'exercise-test', description: 'prints it again for n=1', stdin: '1', expectedOutput: 'Hello, Devora!' }
      ]),
      greetCode,
      runCode
    )
    expect(result.testResults[0]?.passed).toBe(true)
    expect(result.testResults[1]?.passed).toBe(false)
    expect(result.testResults[1]?.actualOutput).toBe('wrong output')
    expect(result.allPassed).toBe(false)
    expect(result.error).toBeUndefined()
  })

  it('testResults keep the original test order even when grouped', async () => {
    const runCode = runCodeReturning((stdin) => `out:${stdin}`)
    const result = await runExercise(
      exerciseWith([
        { kind: 'exercise-test', description: 'first', stdin: '', expectedOutput: 'out:' },
        { kind: 'exercise-test', description: 'middle', stdin: '5', expectedOutput: 'out:5' },
        { kind: 'exercise-test', description: 'last', stdin: '', expectedOutput: 'out:' }
      ]),
      greetCode,
      runCode
    )
    expect(result.testResults.map((t) => t.description)).toEqual(['first', 'middle', 'last'])
  })
})

describe('runExercise — stdin grouping', () => {
  it('tests sharing a stdin get ONE runCode call per distinct stdin', async () => {
    const runCode = runCodeReturning((stdin) => `out:${stdin}`)
    const result = await runExercise(
      exerciseWith([
        { kind: 'exercise-test', description: 'first', stdin: '', expectedOutput: 'out:' },
        { kind: 'exercise-test', description: 'middle', stdin: '5', expectedOutput: 'out:5' },
        { kind: 'exercise-test', description: 'last', stdin: '', expectedOutput: 'out:' }
      ]),
      greetCode,
      runCode
    )
    expect(runCode).toHaveBeenCalledTimes(2)
    expect(result.allPassed).toBe(true)
    const stdins = runCode.mock.calls.map((call) => call[0].stdin)
    expect(stdins).toEqual(['', '5'])
    expect(runCode.mock.calls[0]?.[0]).toMatchObject({ language: 'javascript', code: greetCode })
  })

  it('different stdins get separate calls with their own stdin', async () => {
    const runCode = runCodeReturning((stdin) => `n=${stdin}`)
    await runExercise(
      exerciseWith([
        { kind: 'exercise-test', description: 'n=1', stdin: '1', expectedOutput: 'n=1' },
        { kind: 'exercise-test', description: 'n=2', stdin: '2', expectedOutput: 'n=2' }
      ]),
      greetCode,
      runCode
    )
    expect(runCode).toHaveBeenCalledTimes(2)
    expect(runCode.mock.calls.map((call) => call[0].stdin)).toEqual(['1', '2'])
  })
})

describe('runExercise — output normalization', () => {
  it('trailing newline is normalized: "x\\n" vs "x" passes', async () => {
    const runCode = runCodeReturning(() => 'Hello, Devora!\n')
    const result = await runExercise(
      exerciseWith([{ kind: 'exercise-test', description: 'prints the greeting', stdin: '', expectedOutput: 'Hello, Devora!' }]),
      greetCode,
      runCode
    )
    expect(result.testResults[0]?.passed).toBe(true)
    expect(result.allPassed).toBe(true)
  })

  it('inner whitespace difference fails: "x y" vs "x"', async () => {
    const runCode = runCodeReturning(() => 'x y')
    const result = await runExercise(
      exerciseWith([{ kind: 'exercise-test', description: 'prints x', stdin: '', expectedOutput: 'x' }]),
      greetCode,
      runCode
    )
    expect(result.testResults[0]?.passed).toBe(false)
    expect(result.allPassed).toBe(false)
  })

  it('normalizeOutput trims trailing whitespace only', () => {
    expect(normalizeOutput('x\n')).toBe('x')
    expect(normalizeOutput('x  \n\t')).toBe('x')
    expect(normalizeOutput('x y')).toBe('x y')
    expect(normalizeOutput('')).toBe('')
  })
})

describe('runExercise — error path', () => {
  it('run fails → all tests not run (actualOutput null), allPassed false, educational error', async () => {
    const runCode = vi.fn(async () => errorResult('runtime-error', 'consle is not defined'))
    const result = await runExercise(
      exerciseWith([
        { kind: 'exercise-test', description: 'first', stdin: '', expectedOutput: 'out:' },
        { kind: 'exercise-test', description: 'second', stdin: '5', expectedOutput: 'out:5' }
      ]),
      'consle.log("x")',
      runCode
    )
    expect(runCode).toHaveBeenCalledTimes(1)
    expect(result.allPassed).toBe(false)
    expect(result.testResults).toHaveLength(2)
    for (const test of result.testResults) {
      expect(test.actualOutput).toBeNull()
      expect(test.passed).toBe(false)
    }
    expect(result.error).toBeDefined()
    expect(result.error?.message).toBe('consle is not defined')
    expect(result.error?.expected).toBeTruthy()
    expect(result.error?.nextStep).toBeTruthy()
  })

  it('missing provider error still yields an educational error', async () => {
    const runCode = vi.fn(async (): Promise<ExecResult> => ({ status: 'no-provider', stdout: '', stderr: '' }))
    const result = await runExercise(
      exerciseWith([{ kind: 'exercise-test', description: 'first', stdin: '', expectedOutput: 'out:' }]),
      greetCode,
      runCode
    )
    expect(result.allPassed).toBe(false)
    expect(result.testResults[0]?.actualOutput).toBeNull()
    expect(result.error).toBeDefined()
    expect(typeof result.error?.message).toBe('string')
    expect(typeof result.error?.nextStep).toBe('string')
  })

  it('runner that throws does not crash — educational error, tests not run', async () => {
    const runCode = vi.fn(async (): Promise<ExecResult> => {
      throw new Error('network down')
    })
    const result = await runExercise(
      exerciseWith([{ kind: 'exercise-test', description: 'first', stdin: '', expectedOutput: 'out:' }]),
      greetCode,
      runCode
    )
    expect(result.allPassed).toBe(false)
    expect(result.testResults[0]?.actualOutput).toBeNull()
    expect(result.testResults[0]?.passed).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.message).toContain('could not run')
  })
})

describe('runExercise — empty tests', () => {
  it('empty tests array → allPassed true, no test results, no run', async () => {
    const runCode = runCodeReturning(() => 'anything')
    const result = await runExercise(exerciseWith([]), greetCode, runCode)
    expect(result.testResults).toEqual([])
    expect(result.allPassed).toBe(true)
    expect(result.error).toBeUndefined()
    expect(runCode).not.toHaveBeenCalled()
  })
})

describe('runExercise — multiple-choice exercises are not runnable', () => {
  it('language null → not runnable, educational error, no run', async () => {
    const runCode = runCodeReturning(() => 'anything')
    const result = await runExercise(exerciseWith([], { type: 'multiple-choice', language: null }), greetCode, runCode)
    expect(runCode).not.toHaveBeenCalled()
    expect(result.testResults).toEqual([])
    expect(result.allPassed).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.message).toContain('option')
    expect(result.error?.nextStep).toBeTruthy()
  })
})
