import { describe, expect, it } from 'vitest'
import { DEFAULT_LIMITS, getProvider, runCode, type ExecResult } from './index'

describe('execution engine', () => {
  describe('DEFAULT_LIMITS', () => {
    it('matches the contract values', () => {
      expect(DEFAULT_LIMITS).toEqual({ timeoutMs: 10_000, maxOutputBytes: 256_000 })
    })
  })

  describe('getProvider', () => {
    it('routes javascript to the browser-js provider', () => {
      const provider = getProvider('javascript')
      expect(provider).not.toBeNull()
      expect(provider?.id).toBe('browser-js')
      expect(provider?.languages).toContain('javascript')
    })

    it('routes python to the judge0 provider', () => {
      const provider = getProvider('python')
      expect(provider).not.toBeNull()
      expect(provider?.id).toBe('judge0')
      expect(provider?.languages).toContain('python')
    })

    it('returns null for unknown languages', () => {
      expect(getProvider('cobol')).toBeNull()
      expect(getProvider('css')).toBeNull()
      expect(getProvider('')).toBeNull()
      expect(getProvider('   ')).toBeNull()
    })

    it('matches languages case-insensitively', () => {
      expect(getProvider('JavaScript')?.id).toBe('browser-js')
      expect(getProvider(' Python ')?.id).toBe('judge0')
    })
  })

  describe('runCode', () => {
    it('returns a no-provider educational error for an unknown language', async () => {
      const result: ExecResult = await runCode({ language: 'cobol', code: 'display "hi".', stdin: '' })
      expect(result.status).toBe('no-provider')
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      expect(result.error?.message).toContain('cobol')
      expect(result.error?.message).toContain('not available yet')
      expect(result.error?.expected).toBe('one of the supported languages')
      expect(result.error?.nextStep).toContain('supported language')
    })

    it('runs javascript through the public API and joins console output with \\n', async () => {
      const result = await runCode({
        language: 'javascript',
        code: 'console.log("hello", "world"); console.info("second line")'
      })
      expect(result.status).toBe('ok')
      expect(result.stdout).toBe('hello world\nsecond line')
      expect(result.stderr).toBe('')
      expect(result.error).toBeUndefined()
    })

    it('routes python to the judge0 provider through the public API', async () => {
      const provider = getProvider('python')
      expect(provider?.id).toBe('judge0')
      const result: ExecResult = await runCode({ language: 'ruby', code: 'puts "hi"' })
      expect(result.status).toBe('no-provider')
      expect(result.error).toBeDefined()
    })

    it('truncates output past maxOutputBytes', async () => {
      const result = await runCode({
        language: 'javascript',
        code: 'console.log("x".repeat(300000))',
        limits: { maxOutputBytes: 1000 }
      })
      expect(result.status).toBe('ok')
      expect(result.stdout.length).toBeLessThanOrEqual(1000)
    })
  })
})
