import { runCode } from './index'
import type { ExecResult } from './types'

/**
 * The dynamic input loop — "click Run, then just type your input right into
 * the console when the program asks for it" (the unified-terminal experience
 * from the original Vue implementation, code-runner.js, kept identical):
 *
 *  1. Runs the code with whatever input has been collected so far (nothing,
 *     the first time).
 *  2. Detects when the program is blocked on missing input, using
 *     interpreter/runtime error signatures that reliably mean "tried to read
 *     a line but there was nothing left" (EOFError in Python/Ruby,
 *     NoSuchElementException in Java Scanner, EndOfStreamException in C#) —
 *     in that case the scary stack trace is suppressed and the terminal's
 *     prompt stays open and focused.
 *  3. When the learner types a line and presses Enter, the line is appended
 *     to the collected input and the program silently re-runs with the
 *     larger input set. The new stdout is diffed against what was already
 *     printed, so only the NEW output appears — it reads exactly like the
 *     original process continued after the input, even though under the hood
 *     it's a fresh, fast re-execution.
 *
 * Known limitation (same as the Vue implementation): C/C++ silently continue
 * past a failed scanf() on EOF and can't be detected this way — those
 * programs work when all expected input is queued before running once.
 */

const EOF_MARKERS = [
  'EOFError',
  'NoSuchElementException',
  'EndOfStreamException',
  'end of file',
  'STDIN is closed'
]

function looksBlockedOnInput(stderr: string): boolean {
  if (!stderr) return false
  return EOF_MARKERS.some((marker) => stderr.includes(marker))
}

export type TerminalLineType = 'stdout' | 'stderr' | 'stdin' | 'system'

export interface TerminalLine {
  type: TerminalLineType
  /** For stdin lines: the program's prompt prefix merged with what was typed. */
  prompt?: string
  text: string
}

export interface InteractiveState {
  lines: TerminalLine[]
  /** The stdout tail not yet terminated by a newline — a still-open prompt (e.g. "Enter Age: "). */
  pendingPrompt: string
  running: boolean
  awaitingInput: boolean
}

export interface InteractiveRunner {
  run(): Promise<void>
  submitLine(line: string): void
  reset(): void
  isAwaitingInput(): boolean
  getState(): InteractiveState
  subscribe(cb: () => void): () => void
}

export function createInteractiveRunner(ctx: {
  language: string
  getCode: () => string
}): InteractiveRunner {
  let state: InteractiveState = {
    lines: [],
    pendingPrompt: '',
    running: false,
    awaitingInput: false
  }
  const listeners = new Set<() => void>()
  const stdinLines: string[] = []
  let lastStdout = ''

  function emit() {
    listeners.forEach((l) => l())
  }

  function setLine(partial: Partial<InteractiveState>) {
    state = { ...state, ...partial }
    emit()
  }

  function flushPending() {
    if (state.pendingPrompt) {
      const pending = state.pendingPrompt
      setLine({ lines: [...state.lines, { type: 'stdout', text: pending }], pendingPrompt: '' })
    }
  }

  function pushStdout(text: string) {
    if (!text) return
    const combined = state.pendingPrompt + text
    const parts = combined.split('\n')
    const pendingPrompt = parts.pop() ?? ''
    setLine({
      lines: [...state.lines, ...parts.map((p) => ({ type: 'stdout' as const, text: p }))],
      pendingPrompt
    })
  }

  async function execute(freshRun: boolean): Promise<void> {
    if (freshRun) {
      lastStdout = ''
      stdinLines.length = 0
      setLine({ lines: [{ type: 'system', text: 'Running…' }], pendingPrompt: '', awaitingInput: false })
    }
    setLine({ running: true })

    try {
      const stdin = stdinLines.length ? stdinLines.join('\n') + '\n' : ''
      const result: ExecResult = await runCode({
        language: ctx.language,
        code: ctx.getCode(),
        stdin
      })

      const newStdout = result.stdout || ''
      const blocked =
        result.status === 'runtime-error' && looksBlockedOnInput(result.stderr + result.error?.message)

      // Only show the NEW slice of stdout beyond what's already on screen, so
      // re-running after one extra input line reads like the same program
      // continuing, not restarting from scratch.
      const delta = newStdout.startsWith(lastStdout) ? newStdout.slice(lastStdout.length) : newStdout
      lastStdout = newStdout

      if (delta) pushStdout(delta)

      if (blocked) {
        setLine({ awaitingInput: true, running: false })
      } else {
        flushPending()
        const finalLines = [...state.lines]
        if (result.error && result.stderr) {
          finalLines.push({ type: 'stderr', text: result.stderr.replace(/\n$/, '') })
        } else if (result.error) {
          finalLines.push({ type: 'stderr', text: result.error.message })
        }
        if (!newStdout && !result.stderr && !result.error) {
          finalLines.push({ type: 'system', text: '(no output)' })
        }
        setLine({ lines: finalLines, awaitingInput: false, running: false })
      }
    } catch (e) {
      flushPending()
      setLine({
        lines: [
          ...state.lines,
          { type: 'stderr', text: `Could not reach the code runner: ${e instanceof Error ? e.message : String(e)}` }
        ],
        awaitingInput: false,
        running: false
      })
    }
  }

  return {
    run() {
      return execute(true)
    },

    submitLine(line: string) {
      stdinLines.push(line)
      const promptPrefix = state.pendingPrompt
      setLine({
        lines: [...state.lines, { type: 'stdin', text: promptPrefix + line, prompt: promptPrefix }],
        pendingPrompt: ''
      })
      if (state.awaitingInput) {
        void execute(false)
      }
    },

    reset() {
      stdinLines.length = 0
      lastStdout = ''
      setLine({ lines: [], pendingPrompt: '', awaitingInput: false, running: false })
    },

    isAwaitingInput() {
      return state.awaitingInput
    },

    getState() {
      return state
    },

    subscribe(cb: () => void) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    }
  }
}
