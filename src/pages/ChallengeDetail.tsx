import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { findChallenge } from '../lib/curriculum'
import { useProgress } from '../lib/progress'
import { runJavaScript, type RunResult } from '../lib/runner'
import { FullscreenButton } from '../components/FullscreenButton'
import { PageHeader } from '../components/PageHeader'
import { CodeEditor } from '../components/CodeEditor'
import { OutputBar, ConsoleLogs, ErrorExplain } from '../components/OutputBar'
import { TestCases } from '../components/TestCases'
import { HintStepper } from '../components/HintStepper'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { PageSkeleton } from '../components/Loading'

export function ChallengeDetail() {
  const { challengeId } = useParams()
  const ch = challengeId ? findChallenge(challengeId) : null
  const toast = useToast()
  const [progress, actions] = useProgress()
  const [code, setCode] = useState(() => (ch ? (progress.code[ch.id] ?? ch.starter) : '// challenge starter\n'))
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [hints, setHints] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outputRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => setHydrated(true), [])

  const completed = ch ? Boolean(progress.completed[ch.id]) : false

  const onChange = useCallback(
    (v: string) => {
      setCode(v)
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(() => {
        if (ch) actions.saveCode(ch.id, v) // your work survives a page leave, same as lessons
      }, 400)
    },
    [actions, ch]
  )

  async function run() {
    if (!ch) return
    setRunning(true)
    try {
      const r = await runJavaScript(code, ch.tests)
      setResult(r)
      const passedAll = !r.error && r.tests.length > 0 && r.tests.every((t) => t.passed)
      if (passedAll && ch) {
        actions.completeLesson(ch.id)
        toast.push('success', 'Challenge solved!', 'Clean pass. Want to see a different angle? Check "another approach" below.')
      }
    } catch {
      toast.push('error', 'Run failed to start', 'The sandbox hiccuped — reload this page and your code is safe on-screen.')
    } finally {
      setRunning(false)
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  if (!hydrated) return <PageSkeleton />
  if (!ch) {
    return (
      <div className="page">
        <div className="empty">
          <h3>Challenge not found</h3>
          <p>That challenge doesn't exist. The hub always lists the current set.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page page-wide">
      <PageHeader
        trail={[{ label: 'Challenges', to: '/challenges' }, { label: ch.title }]}
        title={ch.title}
        badge={
          <>
            <span className="badge">{ch.difficulty}</span>
            <span className="badge">{ch.topic}</span>
            <span className="badge">{ch.minutes} min</span>
            {completed && (
              <span className="badge badge-success">
                <Icon name="check" size={12} /> solved
              </span>
            )}
          </>
        }
      />

      <div className="workspace">
        <div className="workspace-side">
          <section className="panel panel-pad">
            <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>problem statement</p>
            <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.7 }}>{ch.statement}</p>

            <div className="divider" />
            <p className="label" style={{ marginBottom: 'var(--sp-2)' }}>input</p>
            <p className="muted fs-14">{ch.ioSpec.input}</p>
            <p className="label" style={{ marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>output</p>
            <p className="muted fs-14">{ch.ioSpec.output}</p>
            <p className="label" style={{ marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>constraints</p>
            <p className="muted fs-14">{ch.ioSpec.constraints}</p>

            <div className="divider" />
            <p className="label" style={{ marginBottom: 'var(--sp-2)' }}>worked example</p>
            {ch.examples.map((ex, i) => (
              <div key={i} className="row" style={{ alignItems: 'stretch', gap: 'var(--sp-2)' }}>
                <span className="badge">in</span>
                <code className="mono fs-12" style={{ background: 'var(--code-bg)', padding: 'var(--sp-1) var(--sp-2)', borderRadius: 'var(--r-sm)' }}>{ex.in}</code>
                <span className="badge">out</span>
                <code className="mono fs-12" style={{ background: 'var(--code-bg)', padding: 'var(--sp-1) var(--sp-2)', borderRadius: 'var(--r-sm)' }}>{ex.out}</code>
              </div>
            ))}
          </section>

          <HintStepper
            hints={ch.hints}
            explanation={ch.anotherApproach ?? 'There is no single correct answer — but there is always a clean one.'}
            revealed={hints}
            defaultCollapsed
            onReveal={() => setHints((h) => Math.min(h + 1, ch.hints.length + 1))}
          />

          {completed && ch.anotherApproach && (
            <section className="panel panel-pad" style={{ borderLeft: '3px solid var(--accent)' }}>
              <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>another approach</p>
              <p style={{ fontSize: 'var(--fs-14)' }}>{ch.anotherApproach}</p>
              <p className="muted fs-12" style={{ marginTop: 'var(--sp-3)' }}>
                Try rewriting your solution this way in the editor — solving twice is deliberate practice.
              </p>
            </section>
          )}
        </div>

        <section className="window" aria-label="Editor and output">
          <div className="window-bar">
            <div className="window-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className="window-title">challenge.js — Devora</span>
          </div>
          {/* Controls ABOVE the editor */}
          <div style={{ display: 'flex', gap: 'var(--sp-2)', padding: 'var(--sp-2) var(--sp-3)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm" icon={<Icon name="play" size={13} filled />} onClick={run} disabled={running} style={{ minHeight: 44 }}>
              {running ? 'Running…' : 'Run checks'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Icon name="rotate" size={13} />}
              onClick={() => {
                if (code !== ch.starter && !window.confirm('Reset erases your current code and reloads the starter. Continue?')) return
                setCode(ch.starter)
                actions.saveCode(ch.id, ch.starter)
                setResult(null)
              }}
              style={{ minHeight: 44 }}
            >
              Reset
            </Button>
            <span style={{ flex: 1 }} />
            <FullscreenButton />
          </div>
          <CodeEditor value={code} onChange={onChange} />
          <div ref={outputRef}>
            <OutputBar result={result} running={running} />
            {result?.error && <ErrorExplain result={result} />}
            {result && !result.error && <TestCases tests={result.tests} label="Test cases (each passes or fails on its own)" />}
            {result && <ConsoleLogs result={result} />}
          </div>
        </section>
      </div>
    </div>
  )
}
