import type { ExecRequest, ExecResult, ExecutionProvider } from './types'

const IFRAME_STYLE =
  'position:fixed;left:-9999px;top:0;width:10px;height:10px;border:0;visibility:hidden;'

let frame: HTMLIFrameElement | null = null

function sandbox(): HTMLIFrameElement {
  if (!frame) {
    frame = document.createElement('iframe')
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = IFRAME_STYLE
    document.body.appendChild(frame)
  }
  return frame
}

interface SandboxEvent {
  message?: unknown
  reason?: unknown
}

interface SandboxWindow {
  Function: new (...args: string[]) => (...args2: unknown[]) => unknown
  addEventListener(type: 'error' | 'unhandledrejection', listener: (event: SandboxEvent) => void): void
}

function isErrorLike(value: unknown): value is { name: string; message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'message' in value &&
    typeof (value as { name: unknown }).name === 'string' &&
    typeof (value as { message: unknown }).message === 'string'
  )
}

/** Formats one console argument as text (cross-realm safe, so Error-like
 *  values from the sandbox are detected by shape, not instanceof). */
export function formatArg(value: unknown): string {
  if (typeof value === 'string') return value
  if (isErrorLike(value)) return `${value.name}: ${value.message}`
  try {
    const json = JSON.stringify(value)
    return json === undefined ? String(value) : json
  } catch {
    return String(value)
  }
}

/** Assembles captured output lines — joined with \n (learning engine
 *  normalizes further; nothing is trimmed here). */
export function assembleOutput(lines: string[]): string {
  return lines.join('\n')
}

function syntaxNextStep(message: string): string {
  if (/unexpected token|illegal token|unexpected identifier|unexpected end/i.test(message))
    return 'Check brackets, quotes and semicolons around the line the error points to — that is usually where the typo is.'
  return 'Read the error left to right — it names the first thing the language could not understand.'
}

function runtimeNextStep(message: string): string {
  if (/is not defined/i.test(message))
    return 'A name was used that was never created. Check the spelling, or declare the variable or function before using it.'
  if (/is not a function/i.test(message))
    return 'You called something that is not a function. Check the name and that parentheses follow the right value.'
  if (/cannot read propert/i.test(message))
    return 'The code read from a value that was null or undefined — check where that value should have been created.'
  return 'Read the error left to right — it names the first thing that went wrong, then fix that first.'
}

/**
 * Runs JavaScript in a hidden sandboxed iframe (sandbox='allow-scripts') with a
 * console proxy capturing output — same approach as lib/runner.ts, written
 * fresh for this engine. Code is wrapped in an async IIFE so top-level await
 * works and each run's bindings stay scoped to that run.
 *
 * Limitations (V1, honest):
 * - stdin is not applicable in the browser and is ignored.
 * - A synchronous infinite loop blocks the shared event loop, so the timeout
 *   cannot interrupt it; async paths ARE bounded by the deadline.
 * - console.log/info join into stdout; warn/error join into stderr.
 */
async function run(req: ExecRequest): Promise<ExecResult> {
  const timeoutMs = req.limits?.timeoutMs ?? 10_000
  const f = sandbox()
  const win = f.contentWindow as unknown as SandboxWindow | null
  if (!win) {
    return {
      status: 'runtime-error',
      stdout: '',
      stderr: '',
      error: {
        message: 'The in-browser sandbox could not be started.',
        expected: 'a working JavaScript sandbox',
        nextStep: 'Reload the page and try running the code again.'
      }
    }
  }

  const stdoutLines: string[] = []
  const stderrLines: string[] = []

  const consoleProxy = {
    log: (...args: unknown[]) => {
      stdoutLines.push(args.map(formatArg).join(' '))
    },
    info: (...args: unknown[]) => {
      stdoutLines.push(args.map(formatArg).join(' '))
    },
    warn: (...args: unknown[]) => {
      stderrLines.push(args.map(formatArg).join(' '))
    },
    error: (...args: unknown[]) => {
      stderrLines.push(args.map(formatArg).join(' '))
    }
  }

  let windowError: string | null = null
  const onError = (event: SandboxEvent) => {
    if (windowError === null && typeof event.message === 'string') windowError = event.message
  }
  const onUnhandledRejection = (event: SandboxEvent) => {
    if (windowError === null) windowError = formatArg(event.reason)
  }
  win.addEventListener('error', onError)
  win.addEventListener('unhandledrejection', onUnhandledRejection)

  let fn: (...args2: unknown[]) => unknown
  try {
    fn = new win.Function('console', `'use strict';\nreturn (async () => {\n${req.code}\n})();`)
  } catch (e) {
    const message = isErrorLike(e) ? `${e.name}: ${e.message}` : String(e)
    return {
      status: 'compile-error',
      stdout: assembleOutput(stdoutLines),
      stderr: assembleOutput(stderrLines),
      error: {
        message,
        expected: 'your program to run and finish',
        nextStep: syntaxNextStep(message)
      }
    }
  }

  let thrown: unknown = null
  const runPromise = (async () => {
    try {
      await fn(consoleProxy)
    } catch (e) {
      thrown = e
    }
  })()
  let timer: ReturnType<typeof setTimeout> | null = null
  const deadline = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs)
  })
  const outcome = await Promise.race([runPromise, deadline])
  if (timer) clearTimeout(timer)

  if (outcome === 'timeout') {
    return {
      status: 'timeout',
      stdout: assembleOutput(stdoutLines),
      stderr: assembleOutput(stderrLines),
      error: {
        message: 'The program did not finish within the time limit.',
        expected: 'your program to finish within the time limit',
        nextStep: 'Look for a loop that never ends or a wait that never finishes, and give it a way to stop.'
      }
    }
  }

  if (thrown !== null) {
    const message = isErrorLike(thrown) ? `${thrown.name}: ${thrown.message}` : String(thrown)
    return {
      status: 'runtime-error',
      stdout: assembleOutput(stdoutLines),
      stderr: assembleOutput(stderrLines),
      error: {
        message,
        expected: 'your program to run without crashing',
        nextStep: runtimeNextStep(message)
      }
    }
  }

  if (windowError !== null) {
    return {
      status: 'runtime-error',
      stdout: assembleOutput(stdoutLines),
      stderr: assembleOutput(stderrLines),
      error: {
        message: windowError,
        expected: 'your program to run without crashing',
        nextStep: runtimeNextStep(windowError)
      }
    }
  }

  return { status: 'ok', stdout: assembleOutput(stdoutLines), stderr: assembleOutput(stderrLines) }
}

export const browserJsProvider: ExecutionProvider = {
  id: 'browser-js',
  languages: ['javascript'],
  run
}
