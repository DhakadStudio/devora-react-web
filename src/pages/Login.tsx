import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmail, signInWithProvider, useAuth } from '../lib/auth'
import { OAUTH_PROVIDERS } from '../lib/supabase'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { ThemeToggle } from '../components/ThemeToggle'
import { PageSkeleton } from '../components/Loading'

export function Login() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!ready) return <PageSkeleton />
  if (user) {
    return (
      <AuthShell title={`Signed in as ${user.email}`}>
        <p className="muted fs-14">You're set. Progress syncs to this account from now on.</p>
        <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
          <Button variant="primary" onClick={() => navigate('/')}>
            Continue learning
            <Icon name="arrowR" size={14} />
          </Button>
        </div>
      </AuthShell>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('What happened: that email address looks incomplete. What was expected: something like you@example.com.')
      return
    }
    if (password.length < 6) {
      setError('What happened: the password is too short. What was expected: at least 6 characters.')
      return
    }
    setBusy(true)
    try {
      await signInWithEmail(email, password)
      navigate('/')
    } catch (err) {
      setError(`What happened: ${(err as Error).message}. Next step: check the credentials, or create an account below — progress in this browser carries over.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Sign in">
      <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--sp-4)' }} noValidate>
        <div className="field">
          <label htmlFor="lg-email">Email</label>
          <input id="lg-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
        </div>
        <div className="field">
          <label htmlFor="lg-pass">Password</label>
          <input id="lg-pass" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
          <p className="muted fs-12">
            <Link to="/reset-password" style={{ color: 'var(--accent)', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
              Forgot password?
            </Link>
          </p>
        </div>
        {error && (
          <p className="field-err" role="alert">
            <Icon name="alert" size={13} />
            {error}
          </p>
        )}
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="divider" />
      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        {OAUTH_PROVIDERS.map((p) => (
          <Button
            key={p.id}
            variant="secondary"
            onClick={() =>
              signInWithProvider(p.id).catch((e) =>
                setError(`What happened: ${e.message}. Next step: try email sign-in instead — it always works offline-first.`)
              )
            }
          >
            Continue with {p.label}
          </Button>
        ))}
      </div>

      <p className="muted fs-14" style={{ marginTop: 'var(--sp-5)' }}>
        No account yet?{' '}
        <Link to="/signup" style={{ color: 'var(--accent)', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
          Create one
        </Link>
        {' '}— or keep learning without an account. Everything is saved locally either way.
      </p>
    </AuthShell>
  )
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 'var(--sp-5)' }}>
      <div className="panel panel-pad rise" style={{ width: '100%', maxWidth: 420 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
          <Link to="/" className="row" style={{ gap: 'var(--sp-2)', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontWeight: 600, minHeight: 44 }}>
            <span className="brand-mark" aria-hidden="true">
              <Icon name="terminal" size={14} />
            </span>
            devora
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="mono" style={{ fontSize: 'var(--fs-20)', fontWeight: 600, marginBottom: 'var(--sp-4)' }}>
          {title}
        </h1>
        {children}
      </div>
    </div>
  )
}
