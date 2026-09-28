import type { ExerciseContent, ExerciseTest } from '../curriculum/content'
import type { ExecResult } from '../execution'

export interface TestCaseResult {
  description: string
  stdin: string
  expectedOutput: string
  actualOutput: string | null
  passed: boolean
}

export interface ExerciseRunResult {
  testResults: TestCaseResult[]
  allPassed: boolean
  error?: ExecResult['error']
}

export type RunCodeFn = (req: { language: string; code: string; stdin?: string }) => Promise<ExecResult>

export function normalizeOutput(s: string): string {
  return s.replace(/\s+$/, '')
}

export async function runExercise(exercise: ExerciseContent, code: string, runCode: RunCodeFn): Promise<ExerciseRunResult> {
  if (exercise.language === null) return notRunnableResult()
  if (exercise.tests.length === 0) return { testResults: [], allPassed: true }

  const groups = groupByStdin(exercise.tests)
  const outcomes = new Map<ExerciseTest, { actual: string; passed: boolean }>()
  let failure: ExecResult | null = null

  for (const [stdin, group] of groups) {
    const result = await safeRun(runCode, exercise.language, code, stdin)
    if (result.status !== 'ok') {
      failure = result
      break
    }
    const actual = normalizeOutput(result.stdout)
    for (const test of group) {
      outcomes.set(test, { actual, passed: actual === normalizeOutput(test.expectedOutput) })
    }
  }

  const testResults: TestCaseResult[] = exercise.tests.map((test) => {
    const outcome = failure === null ? outcomes.get(test) : undefined
    if (!outcome) return notRunResult(test)
    return {
      description: test.description,
      stdin: test.stdin,
      expectedOutput: test.expectedOutput,
      actualOutput: outcome.actual,
      passed: outcome.passed
    }
  })

  const result: ExerciseRunResult = { testResults, allPassed: testResults.every((test) => test.passed) }
  if (failure !== null) result.error = educationalError(failure)
  return result
}

function groupByStdin(tests: ExerciseTest[]): Map<string, ExerciseTest[]> {
  const groups = new Map<string, ExerciseTest[]>()
  for (const test of tests) {
    const group = groups.get(test.stdin)
    if (group !== undefined) group.push(test)
    else groups.set(test.stdin, [test])
  }
  return groups
}

async function safeRun(runCode: RunCodeFn, language: string, code: string, stdin: string): Promise<ExecResult> {
  try {
    return await runCode({ language, code, stdin })
  } catch {
    return {
      status: 'runtime-error',
      stdout: '',
      stderr: '',
      error: {
        message: 'We could not run your code just now.',
        expected: 'the program to run and print its output for each test case',
        nextStep: 'Try running again in a moment; if it keeps failing, check your code for syntax errors.'
      }
    }
  }
}

function notRunResult(test: ExerciseTest): TestCaseResult {
  return {
    description: test.description,
    stdin: test.stdin,
    expectedOutput: test.expectedOutput,
    actualOutput: null,
    passed: false
  }
}

function notRunnableResult(): ExerciseRunResult {
  return {
    testResults: [],
    allPassed: false,
    error: {
      message: 'This exercise is answered by picking an option, not by running code.',
      expected: 'a multiple-choice answer selected from the options list',
      nextStep: 'Choose one of the options above to check your answer.'
    }
  }
}

function educationalError(result: ExecResult): ExecResult['error'] {
  if (result.error !== undefined) return result.error
  switch (result.status) {
    case 'runtime-error':
      return {
        message: 'Your program hit a runtime error while running.',
        expected: 'the program to run and print its output for each test case',
        nextStep: 'Read the error message in the output pane, fix the problem, then run again.'
      }
    case 'timeout':
      return {
        message: 'Your program took too long to finish.',
        expected: 'the program to finish within the time limit',
        nextStep: 'Check for very long loops or missing exit conditions, then run again.'
      }
    case 'compile-error':
      return {
        message: 'Your program has a syntax error and could not start.',
        expected: 'code the interpreter can parse',
        nextStep: 'Check the output pane for the line with the mistake, fix it, then run again.'
      }
    case 'no-provider':
      return {
        message: 'The language for this exercise is not available right now.',
        expected: 'a supported language runner',
        nextStep: 'Pick a supported language from the language list, then run again.'
      }
    default:
      return {
        message: 'Your program did not run as expected.',
        expected: 'the program to run and print its output for each test case',
        nextStep: 'Run again; if it keeps failing, check your code for mistakes.'
      }
  }
}
