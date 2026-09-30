import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/supabase', () => ({ getSupabase: vi.fn() }))

function b64(text: string): string {
  return btoa(text)
}

function jsonResponse(payload: Record<string, unknown>) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload)
  } as unknown as Response
}

interface CapturedCall {
  url: string
  body: string | null
}

let fetchQueue: Response[] = []
const calls: CapturedCall[] = []

const fetchMock = vi.fn((url: string | URL | Request, init?: RequestInit) => {
  calls.push({ url: String(url), body: typeof init?.body === 'string' ? init.body : null })
  const next = fetchQueue.shift()
  if (!next) {
    return Promise.resolve(jsonResponse({ status: { id: 3, description: 'Accepted' }, stdout: b64(''), stderr: b64('') }))
  }
  return Promise.resolve(next)
})

vi.stubGlobal('fetch', fetchMock)

import { createInteractiveRunner } from './interactive'

function queueSubmitResult(result: Record<string, unknown>) {
  fetchQueue = [jsonResponse(result)]
}

function lastSubmitStdin(): string | null {
  for (let i = calls.length - 1; i >= 0; i--) {
    if (calls[i].url.includes('/submissions') && calls[i].body) {
      const parsed = JSON.parse(calls[i].body!) as { stdin?: string }
      return parsed.stdin ?? ''
    }
  }
  return null
}

const LESSON_CODE = 'name = input()\nprint(f"Hello, {name}")'

describe('interactive runner — the dynamic input loop', () => {
  beforeEach(() => {
    fetchQueue = []
    calls.length = 0
    fetchMock.mockClear()
  })

  it('first run: no stdin, program blocks on input → awaitingInput, prompt stays open, scary trace suppressed', async () => {
    queueSubmitResult({
      status: { id: 7, description: 'Runtime Error (NZEC)' },
      stdout: b64(''),
      stderr: b64('Traceback (most recent call last):\nEOFError: EOF when reading a line')
    })
    const runner = createInteractiveRunner({ language: 'python', getCode: () => LESSON_CODE })
    await runner.run()
    const state = runner.getState()
    expect(runner.isAwaitingInput()).toBe(true)
    expect(state.awaitingInput).toBe(true)
    expect(state.running).toBe(false)
    expect(state.lines.some((l) => l.text.includes('EOFError'))).toBe(false)
  })

  it('submitLine while blocked: re-runs with the collected stdin and shows only the NEW output', async () => {
    queueSubmitResult({
      status: { id: 7, description: 'Runtime Error (NZEC)' },
      stdout: b64(''),
      stderr: b64('EOFError: EOF when reading a line')
    })
    const runner = createInteractiveRunner({ language: 'python', getCode: () => LESSON_CODE })
    await runner.run()

    queueSubmitResult({
      status: { id: 3, description: 'Accepted' },
      stdout: b64('Hello, Devora\n'),
      stderr: b64('')
    })
    runner.submitLine('Devora')
    await vi.waitFor(() => expect(runner.isAwaitingInput()).toBe(false))
    const state = runner.getState()
    expect(state.lines.some((l) => l.type === 'stdin' && l.text === 'Devora')).toBe(true)
    expect(state.lines.some((l) => l.type === 'stdout' && l.text === 'Hello, Devora')).toBe(true)
    expect(lastSubmitStdin()).toBe('Devora\n')
  })

  it('collected input accumulates across multiple submitted lines', async () => {
    queueSubmitResult({
      status: { id: 7, description: 'Runtime Error (NZEC)' },
      stdout: b64(''),
      stderr: b64('EOFError')
    })
    const runner = createInteractiveRunner({
      language: 'python',
      getCode: () => 'a = input()\nb = input()\nprint(a, b)'
    })
    await runner.run()

    queueSubmitResult({
      status: { id: 7, description: 'Runtime Error (NZEC)' },
      stdout: b64(''),
      stderr: b64('EOFError')
    })
    runner.submitLine('5')
    await vi.waitFor(() => expect(runner.isAwaitingInput()).toBe(true))

    queueSubmitResult({
      status: { id: 3, description: 'Accepted' },
      stdout: b64('5 6\n'),
      stderr: b64('')
    })
    runner.submitLine('6')
    await vi.waitFor(() => expect(runner.isAwaitingInput()).toBe(false))
    expect(lastSubmitStdin()).toBe('5\n6\n')
    expect(runner.getState().lines.some((l) => l.type === 'stdout' && l.text === '5 6')).toBe(true)
  })

  it('stdout diff: re-run after input does not repeat output already on screen', async () => {
    queueSubmitResult({
      status: { id: 7, description: 'Runtime Error (NZEC)' },
      stdout: b64('Enter your name: '),
      stderr: b64('EOFError: EOF when reading a line')
    })
    const runner = createInteractiveRunner({ language: 'python', getCode: () => LESSON_CODE })
    await runner.run()

    queueSubmitResult({
      status: { id: 3, description: 'Accepted' },
      stdout: b64('Enter your name: Devora\n'),
      stderr: b64('')
    })
    runner.submitLine('Devora')
    await vi.waitFor(() => expect(runner.isAwaitingInput()).toBe(false))
    const state = runner.getState()
    const stdoutTexts = state.lines.filter((l) => l.type === 'stdout').map((l) => l.text)
    expect(stdoutTexts.filter((t) => t === 'Enter your name: ').length).toBeLessThanOrEqual(1)
  })

  it('pendingPrompt: an unterminated stdout tail becomes the live prompt, not a finished line', async () => {
    queueSubmitResult({
      status: { id: 7, description: 'Runtime Error (NZEC)' },
      stdout: b64('Enter your name: '),
      stderr: b64('EOFError: EOF when reading a line')
    })
    const runner = createInteractiveRunner({ language: 'python', getCode: () => LESSON_CODE })
    await runner.run()
    expect(runner.getState().pendingPrompt).toBe('Enter your name: ')
  })

  it('reset clears everything', async () => {
    queueSubmitResult({
      status: { id: 7, description: 'Runtime Error (NZEC)' },
      stdout: b64('Enter your name: '),
      stderr: b64('EOFError')
    })
    const runner = createInteractiveRunner({ language: 'python', getCode: () => LESSON_CODE })
    await runner.run()
    runner.reset()
    expect(runner.getState().lines).toHaveLength(0)
    expect(runner.getState().pendingPrompt).toBe('')
    expect(runner.isAwaitingInput()).toBe(false)
  })

  it('a non-input crash shows the error normally (not suppressed)', async () => {
    queueSubmitResult({
      status: { id: 7, description: 'Runtime Error (NZEC)' },
      stdout: b64(''),
      stderr: b64('ZeroDivisionError: division by zero')
    })
    const runner = createInteractiveRunner({ language: 'python', getCode: () => '1/0' })
    await runner.run()
    const state = runner.getState()
    expect(runner.isAwaitingInput()).toBe(false)
    expect(state.lines.some((l) => l.type === 'stderr' && l.text.includes('ZeroDivisionError'))).toBe(true)
  })
})
