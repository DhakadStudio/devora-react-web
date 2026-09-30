import { afterEach, describe, expect, it, vi } from 'vitest'
import { judge0Provider } from './judge0'

function b64(text: string): string {
  return btoa(text)
}

function b64OrNull(text: string | null): string | null {
  return text === null ? null : b64(text)
}

interface FetchCall {
  url: string
  init?: RequestInit
}

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload)
  } as unknown as Response
}

function httpErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({})
  } as unknown as Response
}

/** Responses are served in order; the last one repeats for extra polls. */
function setupFetch(responses: Response[]) {
  const calls: FetchCall[] = []
  let served = 0
  const fetchMock = vi.fn((url: unknown, init?: unknown) => {
    calls.push({ url: String(url), init: init as RequestInit | undefined })
    const response = responses[Math.min(served, responses.length - 1)]
    served += 1
    return Promise.resolve(response)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}

describe('judge0 provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('submission', () => {
    it('posts base64-encoded code and stdin to the judge0 submissions endpoint', async () => {
      const { calls } = setupFetch([
        jsonResponse({ token: 'tok-1' }),
        jsonResponse({ status: { id: 3, description: 'Accepted' }, stdout: b64('hello\n'), stderr: b64('') })
      ])
      const result = await judge0Provider.run({
        language: 'python',
        code: 'print("hello")',
        stdin: 'world'
      })
      expect(calls[0].url).toBe('https://ce.judge0.com/submissions?base64_encoded=true')
      expect(calls[0].init?.method).toBe('POST')
      const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>
      expect(body).toEqual({
        language_id: 71,
        source_code: b64('print("hello")'),
        stdin: b64('world')
      })
      expect(result.status).toBe('ok')
    })

    it('encodes an absent stdin as an empty base64 string', async () => {
      const { calls } = setupFetch([
        jsonResponse({ token: 'tok-1' }),
        jsonResponse({ status: { id: 3, description: 'Accepted' }, stdout: b64(''), stderr: b64('') })
      ])
      await judge0Provider.run({ language: 'python', code: 'print(1)' })
      const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>
      expect(body.stdin).toBe(b64(''))
    })

    it('polls GET /submissions/{token}?base64_encoded=true and decodes base64 stdout/stderr', async () => {
      const { calls } = setupFetch([
        jsonResponse({ token: 'tok-1' }),
        jsonResponse({
          status: { id: 3, description: 'Accepted' },
          stdout: b64('line one\nline two'),
          stderr: b64('a warning')
        })
      ])
      const result = await judge0Provider.run({ language: 'python', code: 'print("line one")', stdin: '' })
      expect(calls[1].url).toBe('https://ce.judge0.com/submissions/tok-1?base64_encoded=true')
      expect(result.status).toBe('ok')
      expect(result.stdout).toBe('line one\nline two')
      expect(result.stderr).toBe('a warning')
      expect(result.error).toBeUndefined()
    })

    it('keeps polling until the status is terminal (id >= 3)', async () => {
      const { calls } = setupFetch([
        jsonResponse({ token: 'tok-1' }),
        jsonResponse({ status: { id: 1, description: 'In Queue' }, stdout: b64OrNull(null), stderr: b64OrNull(null) }),
        jsonResponse({ status: { id: 2, description: 'Processing' }, stdout: b64OrNull(null), stderr: b64OrNull(null) }),
        jsonResponse({ status: { id: 3, description: 'Accepted' }, stdout: b64('done'), stderr: b64('') })
      ])
      const result = await judge0Provider.run({ language: 'python', code: 'print("done")', stdin: '' })
      expect(result.status).toBe('ok')
      expect(result.stdout).toBe('done')
      expect(calls).toHaveLength(4)
    })

    it('returns an educational error when the submission has no token', async () => {
      const { calls } = setupFetch([jsonResponse({})])
      const result = await judge0Provider.run({ language: 'python', code: 'print("hi")', stdin: '' })
      expect(result.status).toBe('runtime-error')
      expect(result.error?.message).toContain('token')
      expect(result.error?.nextStep).toBeTruthy()
      expect(calls).toHaveLength(1)
    })
  })

  describe('status mapping', () => {
    it('maps status 5 (Time Limit Exceeded) to timeout', async () => {
      setupFetch([
        jsonResponse({ token: 'tok-1' }),
        jsonResponse({
          status: { id: 5, description: 'Time Limit Exceeded' },
          stdout: b64('partial'),
          stderr: b64('')
        })
      ])
      const result = await judge0Provider.run({ language: 'python', code: 'while True: pass', stdin: '' })
      expect(result.status).toBe('timeout')
      expect(result.stdout).toBe('partial')
      expect(result.error?.expected).toBe('your program to finish within the time limit')
      expect(result.error?.nextStep).toBeTruthy()
    })

    it('maps status 6 (Compilation Error) to compile-error with the compiler message', async () => {
      setupFetch([
        jsonResponse({ token: 'tok-1' }),
        jsonResponse({
          status: { id: 6, description: 'Compilation Error' },
          stdout: b64(''),
          stderr: b64(''),
          compile_output: b64('SyntaxError: invalid syntax')
        })
      ])
      const result = await judge0Provider.run({ language: 'python', code: 'print("hi"', stdin: '' })
      expect(result.status).toBe('compile-error')
      expect(result.error?.message).toBe('SyntaxError: invalid syntax')
      expect(result.error?.expected).toBe('your program to run and finish')
      expect(result.error?.nextStep).toContain('left to right')
    })

    it('maps other terminal statuses (4, 7-14) to runtime-error with stderr as the message', async () => {
      setupFetch([
        jsonResponse({ token: 'tok-1' }),
        jsonResponse({
          status: { id: 7, description: 'Runtime Error (NZEC)' },
          stdout: b64(''),
          stderr: b64('ZeroDivisionError: division by zero')
        })
      ])
      const result = await judge0Provider.run({ language: 'python', code: '1/0', stdin: '' })
      expect(result.status).toBe('runtime-error')
      expect(result.error?.message).toBe('ZeroDivisionError: division by zero')
      expect(result.error?.expected).toBe('your program to run without crashing')
      expect(result.error?.nextStep).toBeTruthy()
    })
  })

  describe('deadline', () => {
    it('stops polling past the client-side deadline and returns timeout', async () => {
      const { calls } = setupFetch([
        jsonResponse({ token: 'tok-1' }),
        jsonResponse({ status: { id: 1, description: 'In Queue' }, stdout: b64OrNull(null), stderr: b64OrNull(null) })
      ])
      const result = await judge0Provider.run({
        language: 'python',
        code: 'print("hi")',
        stdin: '',
        limits: { timeoutMs: 60 }
      })
      expect(result.status).toBe('timeout')
      expect(result.error?.expected).toBe('your program to finish within the time limit')
      expect(result.error?.nextStep).toBeTruthy()
      expect(calls.length).toBeLessThan(6)
    }, 3000)
  })

  describe('failure paths', () => {
    it('returns an educational error when the runner is unreachable', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
      )
      const result = await judge0Provider.run({ language: 'python', code: 'print("hi")', stdin: '' })
      expect(result.status).toBe('runtime-error')
      expect(result.error?.message).toContain('Failed to fetch')
      expect(result.error?.expected).toContain('runner')
      expect(result.error?.nextStep).toBeTruthy()
    })

    it('returns an educational rate-limit error on HTTP 429', async () => {
      setupFetch([httpErrorResponse(429)])
      const result = await judge0Provider.run({ language: 'python', code: 'print("hi")', stdin: '' })
      expect(result.status).toBe('runtime-error')
      expect(result.error?.message).toContain('429')
      expect(result.error?.message.toLowerCase()).toMatch(/rate|limit|wait/)
      expect(result.error?.expected).toBeTruthy()
      expect(result.error?.nextStep.toLowerCase()).toMatch(/wait|again/)
    })

    it('returns an educational server-error on HTTP 5xx', async () => {
      setupFetch([httpErrorResponse(502)])
      const result = await judge0Provider.run({ language: 'python', code: 'print("hi")', stdin: '' })
      expect(result.status).toBe('runtime-error')
      expect(result.error?.message).toContain('502')
      expect(result.error?.nextStep.toLowerCase()).toMatch(/try again|again/)
    })

    it('returns a runtime-error-style educational error for a language judge0 does not support', async () => {
      const { calls } = setupFetch([])
      const result = await judge0Provider.run({ language: 'cobol', code: 'display "hi".', stdin: '' })
      expect(result.status).toBe('runtime-error')
      expect(result.error?.message).toContain('cobol')
      expect(result.error?.nextStep).toBeTruthy()
      expect(calls).toHaveLength(0)
    })
  })
})
