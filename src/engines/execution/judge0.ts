import type { ExecRequest, ExecResult, ExecutionProvider } from './types'

/**
 * Judge0 CE endpoint (public CE, no key).
 * Config-swappable: change this constant to point the provider at a different
 * Judge0 deployment (self-hosted CE, Enterprise, proxy) — no other file needs
 * to change. This is the ONLY place in the app that knows Judge0.
 */
const JUDGE0_BASE_URL = 'https://ce.judge0.com'

/** Judge0 language_id map — every entry verified compile+run on ce.judge0.com
 *  (2026-09-30, matching the original Vue implementation's version picks).
 *  Adding an entry makes the registry route that language here automatically. */
const LANGUAGE_IDS: Record<string, number> = {
  javascript: 102, // Node.js 22.08.0
  typescript: 94, // TypeScript 5.0.3
  python: 100, // Python 3.12.5
  java: 91, // Java (JDK 17.0.6)
  c: 103, // C (GCC 14.1.0)
  cpp: 105, // C++ (GCC 14.1.0)
  csharp: 51, // C# (Mono 6.6.0.161)
  go: 107, // Go 1.23.5
  rust: 108, // Rust 1.85.0
  ruby: 72, // Ruby 2.7.0
  php: 98, // PHP 8.3.11
  kotlin: 111, // Kotlin 2.1.10
  swift: 83, // Swift 5.2.3
  bash: 46, // Bash 5.0.0
  sql: 82, // SQL (SQLite 3.27.2)
  r: 99 // R 4.4.1
}

interface Judge0Status {
  id?: number
  description?: string
}

interface Judge0Result {
  status?: Judge0Status
  stdout?: string | null
  stderr?: string | null
  compile_output?: string | null
}

function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        'The free compiler is rate-limited right now — HTTP 429 (too many runs in a short time).'
      )
    }
    if (response.status >= 500) {
      throw new Error(`The code runner is having trouble — HTTP ${response.status}.`)
    }
    throw new Error(`The code runner responded with HTTP ${response.status}.`)
  }
  return (await response.json()) as T
}

function timeoutResult(result: Judge0Result): ExecResult {
  const stderr = result.stderr ?? ''
  const description = result.status?.description ?? ''
  return {
    status: 'timeout',
    stdout: result.stdout ?? '',
    stderr,
    error: {
      message: stderr !== '' ? stderr : description !== '' ? description : 'The program did not finish within the time limit.',
      expected: 'your program to finish within the time limit',
      nextStep: 'Look for a loop that never ends or a wait that never finishes, and give it a way to stop.'
    }
  }
}

function mapTerminal(result: Judge0Result): ExecResult {
  const statusId = result.status?.id ?? 0
  // wait=true + base64_encoded=false: the response fields are PLAIN TEXT —
  // no decoding.
  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  const compileOutput = result.compile_output ?? ''
  const description = result.status?.description ?? ''

  if (statusId === 3) return { status: 'ok', stdout, stderr }

  if (statusId === 5) return timeoutResult(result)

  if (statusId === 6) {
    const message = compileOutput !== '' ? compileOutput : stderr !== '' ? stderr : description
    return {
      status: 'compile-error',
      stdout,
      stderr,
      error: {
        message,
        expected: 'your program to run and finish',
        nextStep: 'Read the error left to right — it names the first thing the language could not understand.'
      }
    }
  }

  const message = stderr !== '' ? stderr : compileOutput !== '' ? compileOutput : description

  const inputCrash =
    /NoSuchElementException|No line found|EOFError|EOF when reading|InputMismatchException/i.test(
      `${stderr} ${compileOutput}`
    )
  if (inputCrash) {
    return {
      status: 'runtime-error',
      stdout,
      stderr,
      error: {
        message,
        expected: 'input for your program to read — Scanner (Java), input() (Python), cin (C++) and stdin in other languages read from the Input box',
        nextStep: 'Type what your program should read into the Input box under the editor, then run it again.'
      }
    }
  }

  return {
    status: 'runtime-error',
    stdout,
    stderr,
    error: {
      message,
      expected: 'your program to run without crashing',
      nextStep: 'Read the error left to right — it names the first thing that went wrong, then fix that first.'
    }
  }
}

async function run(req: ExecRequest): Promise<ExecResult> {
  const languageId = LANGUAGE_IDS[req.language]
  if (languageId === undefined) {
    return {
      status: 'runtime-error',
      stdout: '',
      stderr: '',
      error: {
        message: `The code runner does not support "${req.language}" yet.`,
        expected: 'a language the runner can execute',
        nextStep: 'Pick one of the supported languages from the language list.'
      }
    }
  }

  const timeoutMs = req.limits?.timeoutMs ?? 15_000

  // ONE request: wait=true holds the connection until the program finishes
  // and the response IS the result (the original Vue implementation's mode —
  // fewer requests per run than submit+poll, kinder to the free tier's rate
  // limit). The client-side deadline is enforced with an AbortController.
  const controller = new AbortController()
  const deadline = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const result = await fetchJson<Judge0Result>(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language_id: languageId,
          source_code: req.code,
          stdin: req.stdin ?? ''
        }),
        signal: controller.signal
      }
    )
    const statusId = result.status?.id
    if (statusId !== undefined && statusId >= 3) return mapTerminal(result)
    return timeoutResult(result)
  } catch (e) {
    if (controller.signal.aborted) {
      return {
        status: 'timeout',
        stdout: '',
        stderr: '',
        error: {
          message: 'The program did not finish within the time limit.',
          expected: 'your program to finish within the time limit',
          nextStep: 'Look for a loop that never ends or a wait that never finishes, and give it a way to stop.'
        }
      }
    }
    const raw = messageOf(e)
    const isNetwork = /failed to fetch|networkerror|load failed/i.test(raw)
    const isRateLimit = /429/.test(raw)
    const isServerError = /HTTP 5\d\d/.test(raw)
    const message = isNetwork
      ? `Could not reach the code runner — ${raw}`
      : raw
    const expected = isRateLimit
      ? 'your program to run — the free compiler allows a limited number of runs per hour'
      : 'the code runner to be reachable'
    const nextStep = isRateLimit
      ? 'Wait a minute and run it again — the limit resets shortly.'
      : isServerError
        ? 'The runner should recover on its own — try running the code again in a moment.'
        : 'Check your internet connection and try running the code again in a moment.'
    return {
      status: 'runtime-error',
      stdout: '',
      stderr: '',
      error: {
        message,
        expected,
        nextStep
      }
    }
  } finally {
    clearTimeout(deadline)
  }
}

export const judge0Provider: ExecutionProvider = {
  id: 'judge0',
  languages: Object.keys(LANGUAGE_IDS),
  run
}
