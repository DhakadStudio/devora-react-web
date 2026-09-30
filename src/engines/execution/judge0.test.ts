import { afterEach, describe, expect, it, vi } from 'vitest'
import { judge0Provider } from './judge0'

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

function httpErrorResponse(status: number) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({})
  } as unknown as Response
}

interface CapturedCall {
  url: string
  body: string | null
  signal?: AbortSignal | null
}

function setupFetch(responses: unknown[]) {
  const calls: CapturedCall[] = []
  const responsesCopy = [...responses]
  const fetchMock = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: typeof init?.body === 'string' ? init.body : null,
      signal: init?.signal ?? undefined
    })
    const next = responsesCopy.shift()
    if (!next) return Promise.resolve(jsonResponse({ status: { id: 3 }, stdout: b64(''), stderr: b64('') }))
    return Promise.resolve(next as Response)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls }
}

function parseBody(body: string | null): Record<string, unknown> {
  return body ? (JSON.parse(body) as Record<string, unknown>) : {}
}

describe('judge0 provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('submission (wait=true — ONE request, the response IS the result)', () => {
    it('posts plain code + stdin to the wait=true endpoint', async () => {
      const { calls } = setupFetch([
        jsonResponse({
          status: { id: 3, description: 'Accepted' },
          stdout: b64('hi\n'),
          stderr: b64('')
        })
      ])
      const result = await judge0Provider.run({ language: 'python', code: 'print("hi")', stdin: 'Devora\n' })
      expect(result.status).toBe('ok')
      expect(result.stdout).toBe('hi\n')
      expect(calls).toHaveLength(1)
      expect(calls[0].url).toContain('base64_encoded=false')
      expect(calls[0].url).toContain('wait=true')
      const body = parseBody(calls[0].body)
      expect(body.language_id).toBe(100) // Python 3.12.5 (verified on ce.judge0.com)
      expect(body.source_code).toBe('print("hi")')
      expect(body.stdin).toBe('Devora\n')
    })

    it('sends an absent stdin as an empty string', async () => {
      const { calls } = setupFetch([jsonResponse({ status: { id: 3 }, stdout: b64(''), stderr: b64('') })])
      await judge0Provider.run({ language: 'python', code: 'print("x")' })
      expect(parseBody(calls[0].body!).stdin).toBe('')
    })
  })

  describe('language routing (all ids verified compile+run on ce.judge0.com 2026-09-30)', () => {
    it('maps every supported language to its verified judge0 id', async () => {
      const { calls } = setupFetch([jsonResponse({ status: { id: 3 }, stdout: b64(''), stderr: b64('') })])
      const expected: Record<string, number> = {
        javascript: 102,
        typescript: 94,
        python: 100,
        java: 91,
        c: 103,
        cpp: 105,
        csharp: 51,
        go: 107,
        rust: 108,
        ruby: 72,
        php: 98,
        kotlin: 111,
        swift: 83,
        bash: 46,
        sql: 82,
        r: 99
      }
      for (const [lang, id] of Object.entries(expected)) {
        calls.length = 0
        await judge0Provider.run({ language: lang, code: 'x' })
        expect(parseBody(calls[0].body!).language_id, `${lang} id`).toBe(id)
      }
    })

    it('returns a runtime-error-style educational error for a language judge0 does not map', async () => {
      const { calls } = setupFetch([])
      const result = await judge0Provider.run({ language: 'cobol', code: 'display "hi".', stdin: '' })
      expect(result.status).toBe('runtime-error')
      expect(result.error?.message).toContain('cobol')
      expect(result.error?.nextStep).toBeTruthy()
      expect(calls).toHaveLength(0)
    })
  })

  describe('status mapping', () => {
    it('maps status 5 (Time Limit Exceeded) to timeout', async () => {
      setupFetch([
        jsonResponse({
          status: { id: 5, description: 'Time Limit Exceeded' },
          stdout: b64(''),
          stderr: b64('')
        })
      ])
      const result = await judge0Provider.run({ language: 'python', code: 'while True: pass', stdin: '' })
      expect(result.status).toBe('timeout')
      expect(result.error?.expected).toBe('your program to finish within the time limit')
      expect(result.error?.nextStep).toBeTruthy()
    })

    it('maps status 6 (Compilation Error) to compile-error with the compiler message', async () => {
      setupFetch([
        jsonResponse({
          status: { id: 6, description: 'Compilation Error' },
          stdout: b64(''),
          stderr: b64(''),
          compile_output: b64("SyntaxError: invalid syntax")
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

  describe('input-missing educational errors', () => {
    it('returns an educational input-missing error when the program crashes reading input', async () => {
      setupFetch([
        jsonResponse({
          status: { id: 7, description: 'Runtime Error (NZEC)' },
          stdout: b64(''),
          stderr: b64('Exception in thread "main" java.util.NoSuchElementException\n\tat java.base/java.util.Scanner.nextInt(Scanner.java:2258)\n\tat Main.main(Main.java:8)')
        })
      ])
      const result = await judge0Provider.run({ language: 'java', code: 'new Scanner(System.in).nextInt();', stdin: '' })
      expect(result.status).toBe('runtime-error')
      expect(result.error?.message).toContain('NoSuchElementException')
      expect(result.error?.expected).toContain('input')
      expect(result.error?.nextStep.toLowerCase()).toMatch(/input|type/)
    })

    it('returns an educational input-missing error for Python EOF-on-input crashes', async () => {
      setupFetch([
        jsonResponse({
          status: { id: 7, description: 'Runtime Error (NZEC)' },
          stdout: b64(''),
          stderr: b64('Traceback (most recent call last):\nEOFError: EOF when reading a line')
        })
      ])
      const result = await judge0Provider.run({ language: 'python', code: 'input()', stdin: '' })
      expect(result.status).toBe('runtime-error')
      expect(result.error?.message).toContain('EOFError')
      expect(result.error?.expected).toContain('input')
      expect(result.error?.nextStep.toLowerCase()).toMatch(/input|type/)
    })
  })

  describe('deadline + failure paths', () => {
    it('aborts past the client-side deadline and returns timeout', async () => {
      const calls: CapturedCall[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_url: string | URL | Request, init?: RequestInit) =>
            new Promise((_resolve, reject) => {
              calls.push({ url: String(_url), body: null, signal: init?.signal ?? undefined })
              init?.signal?.addEventListener('abort', () =>
                reject(new DOMException('The operation was aborted.', 'AbortError'))
              )
            })
        )
      )
      const result = await judge0Provider.run({
        language: 'python',
        code: 'print("hi")',
        stdin: '',
        limits: { timeoutMs: 120 }
      })
      expect(result.status).toBe('timeout')
      expect(result.error?.expected).toBe('your program to finish within the time limit')
      expect(result.error?.nextStep).toBeTruthy()
      expect(calls[0].signal).toBeTruthy()
    })

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
  })
})
