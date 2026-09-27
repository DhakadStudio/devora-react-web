import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { findLesson, PATHS, type Lesson } from '../lib/curriculum'
import { useProgress } from '../lib/progress'
import { runJavaScript, type RunResult } from '../lib/runner'
import { FullscreenButton } from '../components/FullscreenButton'
import { CodeEditor } from '../components/CodeEditor'
import { OutputBar, ConsoleLogs, ErrorExplain } from '../components/OutputBar'
import { TestCases } from '../components/TestCases'
import { HintStepper } from '../components/HintStepper'
import { CodeBlock } from '../components/JourneyChecklist'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { PageSkeleton } from '../components/Loading'
import { useToast } from '../components/Toast'
import { progressPersistFailed } from '../lib/progress'

const TYPE_BADGE: Record<Lesson['type'], string> = {
  exercise: 'Exercise',
  concept: 'Concept',
  debugging: 'Debugging',
  project: 'Project'
}

export function LessonPage() {
  const { lessonId } = useParams()
  const found = lessonId ? findLesson(lessonId) : null
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  if (!hydrated) return <PageSkeleton />
  if (!found) {
    return (
      <div className="page">
        <div className="empty">
          <h3>Lesson not found</h3>
          <p>What happened: the address points to a lesson that doesn't exist (or was moved).</p>
          <p>Next step: go back to a path and pick from the checklist — it's always up to date.</p>
          <Link className="btn btn-primary" to="/paths">
            Browse paths
          </Link>
        </div>
      </div>
    )
  }
  return <LessonWorkspace path={found.path} lesson={found.lesson} />
}

function LessonWorkspace({ path, lesson }: { path: (typeof PATHS)[number]; lesson: Lesson }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [progress, actions] = useProgress()
  const [code, setCode] = useState(() => progress.code[lesson.id] ?? lesson.starter)
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [hints, setHints] = useState(progress.hintsUsed[lesson.id] ?? 0)
  const [reflection, setReflection] = useState(progress.reflections[lesson.id] ?? '')
  const [checkedSteps, setCheckedSteps] = useState<number[]>([])
  const completed = Boolean(progress.completed[lesson.id])
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outputRef = useRef<HTMLDivElement | null>(null)

  const idx = path.lessons.findIndex((l) => l.id === lesson.id)
  const next = path.lessons[idx + 1]

  const onCodeChange = useCallback(
    (v: string) => {
      setCode(v)
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(() => {
        actions.saveCode(lesson.id, v)
        if (progressPersistFailed())
          toast.push('error', "Progress couldn't be saved", 'Browser storage is full or blocked. Your code is still on screen — copy it somewhere safe.')
      }, 600)
    },
    [actions, lesson.id, toast]
  )

  async function run() {
    setRunning(true)
    try {
      const r = await runJavaScript(code, lesson.tests)
      setResult(r)
      if (!r.error && r.tests.length > 0 && r.tests.every((t) => t.passed)) motivational()
    } catch {
      toast.push('error', 'Run failed to start', 'Something in the sandbox went wrong. Reloading this page fixes it and keeps your code.')
    } finally {
      setRunning(false)
      // bring the result into view so the learner sees what happened
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  function motivational() {
    const totalHints = lesson.hints.length
    const used = hints
    const praise =
      used === 0
        ? 'All checks green — first try, no hints. Well done.'
        : used <= totalHints / 2
          ? 'Passed with just a nudge.'
          : 'Passed — and the hints did their job.'
    toast.push('success', 'Great job!', praise)
  }

  function submit() {
    if (lesson.type === 'project') {
      if (checkedSteps.length !== (lesson.projectSteps?.length ?? 0)) {
        toast.push('error', 'Not all steps are done', 'Check each step in the list before submitting — that IS the checklist.')
        return
      }
    } else if (lesson.type !== 'concept') {
      if (!result) {
        toast.push('error', 'Run first', 'Run your code so the checks can run, then submit.')
        return
      }
      if (result.error || result.tests.some((t) => !t.passed)) {
        toast.push('error', 'Something is still failing', 'Read the failing check below the editor — it names exactly what is off.')
        return
      }
    }
    actions.completeLesson(lesson.id)
    if (reflection.trim()) actions.saveReflection(lesson.id, reflection.trim())
    toast.push('success', lesson.type === 'project' ? 'Project complete!' : 'Lesson complete!', next ? `Up next: ${next.title}` : 'Path complete — pick a new path any time.')
  }

  const isConcept = lesson.type === 'concept'
  const isProject = lesson.type === 'project'
  const showEditor = !isConcept

  return (
    <div className="page page-wide">
      <PageHeader
        trail={[
          { label: path.title, to: `/paths/${path.id}` },
          { label: lesson.module, to: `/paths/${path.id}` },
          { label: lesson.title }
        ]}
        title={lesson.title}
        badge={
          <>
            <span className="badge">{TYPE_BADGE[lesson.type]}</span>
            <span className="badge">{lesson.minutes} min</span>
            {completed && (
              <span className="badge badge-success">
                <Icon name="check" size={12} /> done
              </span>
            )}
          </>
        }
      />

      <div className="workspace">
        {/* --- left column: instructions sized by type --- */}
        <div className="workspace-side">
          {lesson.conceptBody && <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.7 }}>{lesson.conceptBody}</p>}

          {lesson.instructions.length > 0 && (
            <section className="panel panel-pad">
              <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
                {isConcept ? 'Read' : isProject ? 'Goal' : 'Instructions'}
              </p>
              <ol style={{ paddingLeft: '1.2em', display: 'grid', gap: 'var(--sp-2)', fontSize: 'var(--fs-15)' }}>
                {lesson.instructions.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </section>
          )}

          {lesson.solutionExample && (lesson.type === 'exercise' || lesson.type === 'debugging') && (
            <section className="window">
              <div className="tabbar" aria-label="Example">
                <span className="tab" aria-selected="true">
                  example.js
                </span>
              </div>
              <CodeBlock code={lesson.solutionExample} />
            </section>
          )}

          {isProject && lesson.projectSteps && (
            <section className="panel panel-pad" aria-label="Project steps">
              <p className="label" style={{ marginBottom: 'var(--sp-2)' }}>
                Steps — check them off as you go
              </p>
              {lesson.projectSteps.map((s, i) => {
                const on = checkedSteps.includes(i)
                return (
                  <label
                    key={i}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minHeight: 44, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setCheckedSteps((c) => (on ? c.filter((x) => x !== i) : [...c, i]))
                      }
                      style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontSize: 'var(--fs-14)', color: on ? 'var(--muted)' : 'var(--text)', textDecoration: on ? 'line-through' : 'none' }}>
                      {s.label}
                    </span>
                  </label>
                )
              })}
            </section>
          )}

          <HintStepper
            hints={lesson.hints}
            explanation={lesson.explanation}
            revealed={hints}
            defaultCollapsed={false}
            onReveal={() => {
              setHints((h) => {
                const n = Math.min(h + 1, lesson.hints.length + 1)
                actions.addHintUsed(lesson.id)
                return n
              })
            }}
          />
        </div>

        {/* --- right column: editor + run/output always in the same view --- */}
        {showEditor ? (
          <section className="window" aria-label="Editor and output">
            <div className="window-bar">
              <div className="window-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className="window-title">{fileNameFor(lesson)} — Devora</span>
            </div>
            <div className="tabbar" aria-label="Files">
              <span className="tab" aria-selected="true">
                {fileNameFor(lesson)}
              </span>
              <span style={{ marginLeft: 'auto' }} />
            </div>
            {/* Controls ABOVE the editor — always visible on mobile without scrolling */}
            <div style={{ display: 'flex', gap: 'var(--sp-2)', padding: 'var(--sp-2) var(--sp-3)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <Button variant="primary" size="sm" icon={<Icon name="play" size={13} filled />} onClick={run} disabled={running} style={{ minHeight: 44 }}>
                {running ? 'Running…' : 'Run'}
              </Button>
              <Button variant="ghost" size="sm" icon={<Icon name="rotate" size={13} />} onClick={() => { setCode(lesson.starter); setResult(null) }} style={{ minHeight: 44 }}>
                Reset
              </Button>
              <span style={{ flex: 1 }} />
              <FullscreenButton />
              <Button variant="secondary" size="sm" icon={<Icon name="flag" size={13} />} onClick={submit} style={{ minHeight: 44 }}>
                Submit
              </Button>
            </div>
            <CodeEditor value={code} onChange={onCodeChange} language={lesson.starter.includes('<!--') ? 'html' : 'javascript'} />
            <div ref={outputRef}>
              <OutputBar result={result} running={running} />
              {result?.error && <ErrorExplain result={result} />}
              {result && !result.error && <TestCases tests={result.tests} />}
              {result && <ConsoleLogs result={result} />}
            </div>
          </section>
        ) : (
          <section className="panel panel-pad" style={{ display: 'grid', gap: 'var(--sp-4)' }}>
            <p className="label">Concept check</p>
            <p style={{ fontSize: 'var(--fs-15)' }}>
              Think it through, answer in your own words below — the "Finish lesson" button is at the end of this page.
            </p>
          </section>
        )}
      </div>

      {/* --- reflect: completes explain → write → run → fix → reflect --- */}
      <section className="panel panel-pad section-gap" aria-label="Reflect">
        <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
          Reflect (optional, one sentence)
        </p>
        <p className="muted fs-14" style={{ marginBottom: 'var(--sp-3)' }}>
          {lesson.reflectPrompt}
        </p>
        <textarea
          className="input"
          placeholder="In your own words…"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          aria-label="Reflection answer"
        />
        <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
          <Button variant="primary" onClick={submit}>
            {completed ? 'Keep progress' : 'Finish lesson'}
          </Button>
          {next && (
            <Button variant="secondary" onClick={() => { submit(); navigate(`/lesson/${next.id}`) }}>
              Next lesson
              <Icon name="arrowR" size={14} />
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}

function fileNameFor(lesson: Lesson) {
  if (lesson.starter.includes('<!--')) return 'index.html'
  if (lesson.id.startsWith('py-')) return 'main.py'
  return 'main.js'
}
