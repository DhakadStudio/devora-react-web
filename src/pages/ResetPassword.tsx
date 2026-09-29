import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestPasswordReset, updatePassword, useAuth } from '../lib/auth'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { PageSkeleton } from '../components/Loading'
import { AuthShell } from './Login'

/** Two modes in one route: without a session, the email form sends a recovery
 *  link (requestPasswordReset); arriving from a recovery link, supabase picks
 *  up the session and the password form sets a new one (updatePassword). The
 *  mode switch is automatic — the signed-in branch renders as soon as the
 *  recovery session lands. */
export function ResetPassword() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  // ready gates the forms: before it, the recovery session may still be
  // arriving — never flash the email form over it.
  if (!ready) return <PageSkeleton />

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('What happened: that email address looks incomplete. What was expected: something like you@example.com.')
      return
    }
    setBusy(true)
    const r = await requestPasswordReset(email)
    setBusy(false)
    if (r.ok) {
      setSent(true)
    } else {
      setError(`What happened: ${r.error ?? 'the reset email could not be sent'}. Next step: try again in a moment, or keep learning locally — your progress carries over.`)
    }
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('What happened: the password is too short. What was expected: at least 6 characters, not easy to guess.')
      return
    }
    if (password !== confirm) {
      setError("What happened: the two passwords don't match. Next step: retype them slowly once.")
      return
    }
    setBusy(true)
    const r = await updatePassword(password)
    setBusy(false)
    if (r.ok) {
      setDone(true)
    } else {
      setError(`What happened: ${r.error ?? 'the password could not be updated'}. Next step: request a fresh recovery link from the sign-in page and try again.`)
    }
  }

  // Signed in — from a recovery link, or changing the password directly.
  if (user) {
    if (done) {
      return (
        <AuthShell title="Password updated">
          <p className="muted fs-14">Your new password works on every device — use it next time you sign in.</p>
          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <Button variant="primary" onClick={() => navigate('/')}>
              Continue learning
              <Icon name="arrowR" size={14} />
            </Button>
          </div>
        </AuthShell>
      )
    }
    return (
      <AuthShell title="Set a new password">
        <p className="muted fs-14" style={{ marginBottom: 'var(--sp-4)' }}>
          You opened a recovery link — pick a new password and you're back in.
        </p>
        <form onSubmit={submitNew} style={{ display: 'grid', gap: 'var(--sp-4)' }} noValidate>
          <div className="field">
            <label htmlFor="rp-new">New password</label>
            <input
              id="rp-new"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="6+ characters"
            />
            <p className="muted fs-12">At least 6 characters. A passphrase you can type beats a cryptic one you forget.</p>
          </div>
          <div className="field">
            <label htmlFor="rp-confirm">Confirm password</label>
            <input
              id="rp-confirm"
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="once more"
            />
          </div>
          {error && (
            <p className="field-err" role="alert" style={{ alignItems: 'flex-start' }}>
              <Icon name="alert" size={13} />
              {error}
            </p>
          )}
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </Button>
        </form>
        <p className="muted fs-14" style={{ marginTop: 'var(--sp-5)' }}>
          Changed your mind?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    )
  }

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <p className="muted fs-14" role="status">
          We sent a recovery link to <strong>{email}</strong>. Open it on this device to set a new
          password — the link brings you straight back here.
        </p>
        <p className="muted fs-14" style={{ marginTop: 'var(--sp-4)' }}>
          Didn't arrive? Check spam, or wait a minute and try again.
        </p>
        <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
          <Button variant="secondary" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
        <p className="muted fs-14" style={{ marginTop: 'var(--sp-5)' }}>
          <Link to="/login" style={{ color: 'var(--accent)' }}>
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset your password">
      <p className="muted fs-14" style={{ marginBottom: 'var(--sp-4)' }}>
        Enter your email and we'll send a recovery link — no account is touched until you set a new
        password from it.
      </p>
      <form onSubmit={submitEmail} style={{ display: 'grid', gap: 'var(--sp-4)' }} noValidate>
        <div className="field">
          <label htmlFor="rp-email">Email</label>
          <input
            id="rp-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        {error && (
          <p className="field-err" role="alert" style={{ alignItems: 'flex-start' }}>
            <Icon name="alert" size={13} />
            {error}
          </p>
        )}
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send recovery link'}
        </Button>
      </form>
      <p className="muted fs-14" style={{ marginTop: 'var(--sp-5)' }}>
        Remembered it?{' '}
        <Link to="/login" style={{ color: 'var(--accent)' }}>
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}
