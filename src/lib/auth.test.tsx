import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ getSupabase: vi.fn() }))

type AuthFake = {
  auth: {
    resetPasswordForEmail: ReturnType<typeof vi.fn>
    updateUser: ReturnType<typeof vi.fn>
  }
}

function makeAuthFake() {
  const client: AuthFake = {
    auth: {
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn()
    }
  }
  return client
}

async function setup(client: unknown) {
  const supabase = await import('./supabase')
  vi.mocked(supabase.getSupabase).mockReturnValue(client as never)
  const auth = await import('./auth')
  return auth
}

describe('auth password reset', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
  })

  describe('requestPasswordReset', () => {
    it('resolves ok true and redirects to /reset-password on success', async () => {
      const fake = makeAuthFake()
      fake.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
      const auth = await setup(fake)
      const result = await auth.requestPasswordReset('ada@example.com')
      expect(result).toEqual({ ok: true })
      expect(fake.auth.resetPasswordForEmail).toHaveBeenCalledWith('ada@example.com', {
        redirectTo: window.location.origin + '/reset-password'
      })
    })

    it('resolves ok false with the error message on failure', async () => {
      const fake = makeAuthFake()
      fake.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: 'email not found', code: '404', details: null, hint: null }
      })
      const auth = await setup(fake)
      const result = await auth.requestPasswordReset('ada@example.com')
      expect(result).toEqual({ ok: false, error: 'email not found' })
    })

    it('resolves ok false without throwing when the call rejects', async () => {
      const fake = makeAuthFake()
      fake.auth.resetPasswordForEmail.mockRejectedValue(new Error('network down'))
      const auth = await setup(fake)
      const result = await auth.requestPasswordReset('ada@example.com')
      expect(result).toEqual({ ok: false, error: 'network down' })
    })

    it('resolves ok false when supabase is not configured', async () => {
      const auth = await setup(null)
      const result = await auth.requestPasswordReset('ada@example.com')
      expect(result.ok).toBe(false)
      expect(typeof result.error).toBe('string')
      expect(result.error?.length ?? 0).toBeGreaterThan(0)
    })
  })

  describe('updatePassword', () => {
    it('resolves ok true and updates the password on success', async () => {
      const fake = makeAuthFake()
      fake.auth.updateUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      const auth = await setup(fake)
      const result = await auth.updatePassword('new-secret-123')
      expect(result).toEqual({ ok: true })
      expect(fake.auth.updateUser).toHaveBeenCalledWith({ password: 'new-secret-123' })
    })

    it('resolves ok false with the error message on failure', async () => {
      const fake = makeAuthFake()
      fake.auth.updateUser.mockResolvedValue({
        data: null,
        error: { message: 'password should be at least 6 characters', code: '422', details: null, hint: null }
      })
      const auth = await setup(fake)
      const result = await auth.updatePassword('short')
      expect(result).toEqual({ ok: false, error: 'password should be at least 6 characters' })
    })

    it('resolves ok false without throwing when the call rejects', async () => {
      const fake = makeAuthFake()
      fake.auth.updateUser.mockRejectedValue(new Error('session expired'))
      const auth = await setup(fake)
      const result = await auth.updatePassword('new-secret-123')
      expect(result).toEqual({ ok: false, error: 'session expired' })
    })

    it('resolves ok false when supabase is not configured', async () => {
      const auth = await setup(null)
      const result = await auth.updatePassword('new-secret-123')
      expect(result.ok).toBe(false)
      expect(typeof result.error).toBe('string')
      expect(result.error?.length ?? 0).toBeGreaterThan(0)
    })
  })
})
