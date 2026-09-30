import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import { useAuth, signOut } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { useProgress } from '../engines/progress'
import { CHALLENGES } from '../lib/curriculum'
import { listPathsTree } from '../engines/curriculum'
import { useSnippets } from '../lib/snippets'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { Link } from 'react-router-dom'

export function Profile() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const toast = useToast()
  const [progress, actions] = useProgress()
  const [{ items }, snippetOps] = useSnippets()
  const shared = items.filter((s) => s.shared)
  const name = user?.email?.split('@')[0] ?? 'Guest learner'
  const doneCount = Object.values(progress.lessons).filter(
    (s) => s.status === 'passed' || s.status === 'completed'
  ).length
  const reflections = Object.keys(progress.reflections).length
  const challengesDone = Object.keys(progress.lessons).filter((id) => id.startsWith('ch-')).length
  const [lessonCount, setLessonCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    listPathsTree().then((tree) => {
      let count = 0
      for (const p of tree) {
        for (const c of p.courses) {
          for (const m of c.modules) {
            count += m.lessons.length
          }
        }
      }
      if (!cancelled) setLessonCount(count)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSignOut() {
    try {
      await signOut()
      toast.push('info', 'Signed out', 'Your progress stays in this browser.')
    } catch (e) {
      toast.push('error', "Couldn't sign out", (e as Error).message)
    }
  }

  function resetProgress() {
    if (!window.confirm('Reset ALL lesson progress and hints on this device? This cannot be undone.')) return
    actions.resetAll()
    toast.push('info', 'Progress reset', 'A fresh start. Your saved snippets are untouched.')
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ progress, snippets: items }, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'devora-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <PageHeader trail={[{ label: 'Profile' }]} title={name} />

      {/* identity */}
      <section className="panel panel-pad">
        <div className="row">
          <span className="avatar" style={{ width: 48, height: 48, fontSize: 'var(--fs-16)' }}>
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p style={{ fontWeight: 600 }}>{name}</p>
            <p className="muted fs-14">{user ? user.email : 'Not signed in — progress is local to this browser.'}</p>
          </div>
        </div>
        <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
          {user ? (
            <Button variant="secondary" onClick={handleSignOut} icon={<Icon name="arrowL" size={14} />}>
              Sign out
            </Button>
          ) : (
            <Link className="btn btn-primary" to="/login">
              Sign in to sync
            </Link>
          )}
          {!user && (
            <Link className="btn btn-secondary" to="/signup">
              Create account
            </Link>
          )}
        </div>
      </section>

      {/* learning summary */}
      <section className="grid grid-3 section-gap">
        <div className="panel panel-pad">
          <p className="label">lessons</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
            {doneCount}
            <span className="muted fs-12"> / {lessonCount ?? '…'}</span>
          </p>
        </div>
        <div className="panel panel-pad">
          <p className="label">reflections</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>{reflections}</p>
        </div>
        <div className="panel panel-pad">
          <p className="label">challenges</p>
          <p className="mono" style={{ fontSize: 'var(--fs-28)', fontWeight: 600 }}>
            {challengesDone}
            <span className="muted fs-12"> / {CHALLENGES.length}</span>
          </p>
        </div>
      </section>

      {/* project showcase */}
      <section className="section-gap">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
            Your showcase
          </h2>
          <Link className="btn btn-secondary btn-sm" to="/playground">
            New in Playground
          </Link>
        </div>
        {shared.length === 0 ? (
          <div className="empty section-gap">
            <h3>Nothing here yet</h3>
            <p>Save a snippet in the Playground and mark it public for your showcase.</p>
          </div>
        ) : (
          <div className="grid grid-3 section-gap">
            {shared.map((s) => (
              <div key={s.id} className="panel panel-pad">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <p className="card-title mono" style={{ fontSize: 'var(--fs-14)' }}>
                    {s.name}
                  </p>
                  <button
                    className="btn btn-ghost btn-sm"
                    aria-label={`Make ${s.name} private`}
                    onClick={() => snippetOps.toggleShared(s.id)}
                  >
                    Make private
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* settings */}
      <section className="panel panel-pad section-gap" style={{ display: 'grid', gap: 'var(--sp-4)' }}>
        <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
          Settings
        </h2>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 'var(--fs-15)' }}>Theme</p>
            <p className="muted fs-12">Currently {theme}</p>
          </div>
          <Button variant="secondary" onClick={toggle} icon={<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />}>
            Switch to {theme === 'dark' ? 'light' : 'dark'}
          </Button>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 'var(--fs-15)' }}>Export data</p>
            <p className="muted fs-12">Everything saved on this device, as JSON.</p>
          </div>
          <Button variant="secondary" onClick={exportData} icon={<Icon name="download" size={14} />}>
            Download
          </Button>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 'var(--fs-15)' }}>Reset progress</p>
            <p className="muted fs-12">Clears lessons, hints and reflections on this device.</p>
          </div>
          <Button variant="danger" onClick={resetProgress} icon={<Icon name="trash" size={14} />}>
            Reset
          </Button>
        </div>
      </section>
    </div>
  )
}
