import type { ExecRequest, ExecResult, ExecutionProvider } from './types'

/**
 * Judge0 CE endpoint (public CE, no key).
 * Config-swappable: change this constant to point the provider at a different
 * Judge0 deployment (self-hosted CE, Enterprise, proxy) — no other file needs
 * to change. This is the ONLY place in the app that knows Judge0.
 */
const JUDGE0_BASE_URL = 'https://ce.judge0.com'

/** Judge0 language_id map — every entry verified compile+run on ce.judge0.com
 *  (2026-09-30). Adding an entry makes the registry route that language here
 *  automatically. javascript never routes here (browser provider handles it). */
const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  java: 62,
  cpp: 105,
  c: 103,
  csharp: 51,
  go: 60,
  ruby: 72,
  php: 68
}

const POLL_INTERVAL_MS = 250

interface Judge0Submission {
  token?: string
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

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** Decodes base64 payloads. Trim nothing here — normalization is the
 *  learning engine's job. */
function decodeBase64(encoded: string | null | undefined): string {
  if (!encoded) return ''
  const bytes = Uint8Array.from(atob(encoded), (ch) => ch.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  const stderr = decodeBase64(result.stderr)
  const description = result.status?.description ?? ''
  return {
    status: 'timeout',
    stdout: decodeBase64(result.stdout),
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
  const stdout = decodeBase64(result.stdout)
  const stderr = decodeBase64(result.stderr)
  const compileOutput = decodeBase64(result.compile_output)
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
        nextStep: 'Pick one of the supported languages — python, java, cpp, c, csharp, go, ruby and php are available.'
      }
    }
  }

  const timeoutMs = req.limits?.timeoutMs ?? 10_000

  try {
    const submit = await fetchJson<Judge0Submission>(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=true`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language_id: languageId,
          source_code: encodeBase64(req.code),
          stdin: encodeBase64(req.stdin ?? '')
        })
      }
    )
    if (typeof submit.token !== 'string' || submit.token === '') {
      throw new Error('The code runner did not return a submission token.')
    }

    const deadlineAt = Date.now() + timeoutMs
    while (true) {
      const result = await fetchJson<Judge0Result>(
        `${JUDGE0_BASE_URL}/submissions/${submit.token}?base64_encoded=true`
      )
      const statusId = result.status?.id
      if (statusId !== undefined && statusId >= 3) return mapTerminal(result)
      const remaining = deadlineAt - Date.now()
      if (remaining <= 0) return timeoutResult(result)
      await sleep(Math.min(POLL_INTERVAL_MS, remaining))
    }
  } catch (e) {
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
  }
}

export const judge0Provider: ExecutionProvider = {
  id: 'judge0',
  languages: Object.keys(LANGUAGE_IDS),
  run
}
