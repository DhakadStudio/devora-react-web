import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProject, submitProject, type GuidedProject } from '../engines/project'
import { useAuth } from '../lib/auth'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { PageSkeleton } from '../components/Loading'
import { useToast } from '../components/Toast'

export function ProjectPage() {
  const params = useParams()
  const projectId = params['*'] ?? params.projectId
  const [project, setProject] = useState<GuidedProject | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retry, setRetry] = useState(0)

  // Load the project row via the project engine's getProject(projectId) — the
  // route param is the PROJECT id, not a module id.
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setProject(null)
    setLoadFailed(false)
    getProject(projectId).then((p) => {
      if (cancelled) return
      if (p) setProject(p)
      else setLoadFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [projectId, retry])

  // getProject answers null both for a missing project and an unreachable DB,
  // so this state covers both: not-found pattern + retry, never a blank page.
  if (!projectId || loadFailed) {
    return (
      <div className="page">
        <div className="empty">
          <h3>Project not found</h3>
          <p>
            What happened: the address points to a project that doesn't exist — or the content service
            could not be reached just now.
          </p>
          <p>
            Next step: try again below, or open it from its module's checklist on a path page — that list
            is always up to date.
          </p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              icon={<Icon name="rotate" size={13} />}
              onClick={() => setRetry((n) => n + 1)}
            >
              Try again
            </Button>
            <Link className="btn btn-secondary" to="/paths">
              Browse paths
            </Link>
          </div>
        </div>
      </div>
    )
  }
  if (!project) return <PageSkeleton />
  return <ProjectWorkspace key={project.id} project={project} />
}

function ProjectWorkspace({ project }: { project: GuidedProject }) {
  const { user } = useAuth()
  const toast = useToast()
  // The rubric is data: { label, hint? } rows the learner ticks as they meet them.
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [artifact, setArtifact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function toggle(label: string) {
    setChecked((c) => ({ ...c, [label]: !c[label] }))
  }

  // Guest submissions require identity (project_submissions.user_id NOT NULL;
  // RLS blocks guest inserts anyway) — signed-in users submit directly.
  async function submit() {
    if (!user || submitting) return
    if (artifact.trim() === '') {
      setSubmitError(
        'What happened: there is no code to submit yet. Next step: write your code in the editor below — it stays on screen either way.'
      )
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    const r = await submitProject(user.id, project.id, artifact)
    setSubmitting(false)
    if (r.ok) {
      setSubmitted(true)
      toast.push('success', 'Project submitted', 'Your work is saved to your account — you can submit an updated version any time.')
    } else {
      setSubmitError(
        `What happened: ${r.error ?? 'the submission could not be saved'}. Next step: check your connection and submit again — your code stays in the editor either way.`
      )
      toast.push('error', 'Submission failed', 'Your code is still in the editor — nothing was lost.')
    }
  }

  return (
    <div className="page">
      <PageHeader
        trail={[{ label: 'Paths', to: '/paths' }, { label: project.title }]}
        title={project.title}
        badge={<span className="badge">{project.guideLevel}</span>}
      />

      {project.brief && (
        <section className="panel panel-pad">
          <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
            Brief
          </p>
          <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
            {project.brief}
          </p>
        </section>
      )}

      {project.rubric.length > 0 ? (
        <section className="panel panel-pad section-gap">
          <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
            Requirements
          </p>
          <p className="muted fs-14" style={{ marginBottom: 'var(--sp-3)' }}>
            Tick each one as you meet it — the checklist is guidance, not a gate.
          </p>
          <div role="group" aria-label="Project requirements" style={{ display: 'grid', gap: 'var(--sp-2)' }}>
            {project.rubric.map((req, i) => (
              <label
                key={`${req.label}-${i}`}
                className="chip"
                style={{ justifyContent: 'flex-start', alignItems: 'flex-start', gap: 'var(--sp-3)', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={checked[req.label] ?? false}
                  onChange={() => toggle(req.label)}
                  style={{ marginTop: 4, accentColor: 'var(--accent)', width: 16, height: 16 }}
                  aria-label={req.label}
                />
                <span>
                  <span style={{ color: checked[req.label] ? 'var(--success)' : 'var(--text)' }}>{req.label}</span>
                  {req.hint && (
                    <span className="muted fs-12" style={{ display: 'block', marginTop: 2 }}>
                      Hint: {req.hint}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel panel-pad section-gap">
          <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
            Requirements
          </p>
          <p className="muted fs-14" style={{ margin: 0 }}>
            No requirements are listed for this project — build freely from the brief above.
          </p>
        </section>
      )}

      <section className="panel panel-pad section-gap" aria-label="Submit your project">
        <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
          Your code
        </p>
        <p className="muted fs-14" style={{ marginBottom: 'var(--sp-3)' }}>
          Paste or write the code for your project here, then submit it to your account.
        </p>
        <textarea
          className="input mono"
          rows={10}
          placeholder={'console.log("Hello, Devora")'}
          value={artifact}
          onChange={(e) => setArtifact(e.target.value)}
          aria-label="Your project code"
          spellCheck={false}
        />

        {submitted && (
          <div className="hint-item" role="status" style={{ marginTop: 'var(--sp-3)' }}>
            <Icon name="check" size={13} />
            <span>
              <strong>Submitted.</strong> Your work is saved to your account — submit again any time you
              improve it.
            </span>
          </div>
        )}
        {submitError && (
          <p className="field-err" role="alert" style={{ marginTop: 'var(--sp-3)', alignItems: 'flex-start' }}>
            <Icon name="alert" size={13} />
            {submitError}
          </p>
        )}

        {user ? (
          <div className="row" style={{ marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              icon={<Icon name="flag" size={13} />}
              onClick={submit}
              disabled={submitting}
              style={{ minHeight: 44 }}
            >
              {submitting ? 'Submitting…' : submitted ? 'Submit again' : 'Submit project'}
            </Button>
          </div>
        ) : (
          <div className="row" style={{ marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
            <Link
              className="btn btn-primary"
              to="/login"
              style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
            >
              Sign in to submit
              <Icon name="arrowR" size={14} />
            </Link>
            <p className="muted fs-14" style={{ margin: 0, maxWidth: '42ch' }}>
              Submissions need an account so your work is attached to you — your code stays in the editor
              while you sign in.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
