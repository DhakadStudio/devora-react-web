import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUpWithEmail, useAuth } from '../lib/auth'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { AuthShell } from './Login'

export function Signup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) {
    return (
      <AuthShell title="Account ready">
        <p className="muted fs-14">Signed in. Your existing progress on this device is attached to this account.</p>
        <Button variant="primary" style={{ marginTop: 'var(--sp-4)' }} onClick={() => navigate('/')}>
          Continue learning
          <Icon name="arrowR" size={14} />
        </Button>
      </AuthShell>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('What happened: that email address looks incomplete. What was expected: something like you@example.com.')
      return
    }
    if (password.length < 6) {
      setError('What happened: the password is too short. What was expected: at least 6 characters, not easy to guess.')
      return
    }
    if (password !== confirm) {
      setError('What happened: the two passwords don\'t match. Next step: retype them slowly once.')
      return
    }
    setBusy(true)
    try {
      const data = await signUpWithEmail(email, password)
      if (data.session) {
        navigate('/')
      } else {
        setInfo('Account created — check your email to confirm it, then sign in. Your progress here is safe until you do.')
      }
    } catch (err) {
      setError(`What happened: ${(err as Error).message}. Next step: if you already have an account, sign in instead.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create your account">
      <p className="muted fs-14" style={{ marginBottom: 'var(--sp-4)' }}>
        One account, every device. Without it, progress stays local to this browser.
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--sp-4)' }} noValidate>
        <div className="field">
          <label htmlFor="su-email">Email</label>
          <input id="su-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
        </div>
        <div className="field">
          <label htmlFor="su-pass">Password</label>
          <input id="su-pass" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="6+ characters" />
          <p className="muted fs-12">At least 6 characters. A passphrase you can type beats a cryptic one you forget.</p>
        </div>
        <div className="field">
          <label htmlFor="su-pass2">Confirm password</label>
          <input id="su-pass2" className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="once more" />
        </div>
        {error && (
          <p className="field-err" role="alert">
            <Icon name="alert" size={13} />
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="fs-14" style={{ color: 'var(--warning)' }}>
            {info}
          </p>
        )}
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
      <p className="muted fs-14" style={{ marginTop: 'var(--sp-5)' }}>
        Already have one?{' '}
        <Link to="/login" style={{ color: 'var(--accent)' }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
