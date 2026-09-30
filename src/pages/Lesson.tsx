import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getExercise,
  getLesson,
  listLessons,
  type ExerciseContent,
  type Lesson,
  type LessonRef
} from '../engines/curriculum'
import { lessonStages, type LessonStage } from '../engines/learning/stages'
import { runExercise, type ExerciseRunResult } from '../engines/learning/exercise'
import { useHints } from '../engines/learning/hints'
import { gradeMultipleChoice } from '../engines/learning/mc'
import { runCode } from '../engines/execution'
import { useProgress } from '../engines/progress'
import { FullscreenButton } from '../components/FullscreenButton'
import { CodeEditor } from '../components/CodeEditor'
import { OutputBar, ErrorExplain } from '../components/OutputBar'
import { TestCases } from '../components/TestCases'
import { HintStepper } from '../components/HintStepper'
import { CodeBlock } from '../components/JourneyChecklist'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { PageSkeleton } from '../components/Loading'
import { useToast } from '../components/Toast'

/** Stand-in handed to useHints while the exercise content is still loading, so
 *  the hook can be called unconditionally. It carries no hints, so the stepper
 *  stays hidden until real content arrives and the hook's own id reset swaps
 *  the state over. */
const EMPTY_EXERCISE: ExerciseContent = {
  id: '',
  kind: '',
  type: 'multiple-choice',
  language: null,
  instructions: '',
  starterCode: null,
  tests: [],
  hints: null,
  options: null,
  answerIndex: null
}

export function LessonPage() {
  // The app mounts this page under /lesson/* (splat): real lesson ids contain
  // slashes ("module/lesson") and a :lessonId param only matches a single
  // segment. The ?? keeps the named-param shape for alternate mounts.
  const params = useParams()
  const lessonId = params['*'] ?? params.lessonId
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  // Destructured, not the actions object: openLesson is useCallback([])-stable,
  // while the actions literal is fresh every render and would re-fire this
  // effect on every render (infinite update loop).
  const [, { openLesson }] = useProgress()

  // THE CRITICAL LOOP, step 1 — open lesson (progress: guest localStorage or
  // signed-in auto-sync) + fetch the lesson content from the curriculum engine.
  useEffect(() => {
    if (!lessonId) return
    let cancelled = false
    setLesson(null)
    setLoadFailed(false)
    openLesson(lessonId)
    getLesson(lessonId).then((l) => {
      if (cancelled) return
      if (l) setLesson(l)
      else setLoadFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [lessonId, retry, openLesson])

  // getLesson answers null both for a missing lesson and an unreachable DB,
  // so this state covers both: not-found pattern + retry, never a blank page.
  if (!lessonId || loadFailed) {
    return (
      <div className="page">
        <div className="empty">
          <h3>Lesson not found</h3>
          <p>
            What happened: the address points to a lesson that doesn't exist, was moved — or the
            content service could not be reached just now.
          </p>
          <p>
            Next step: try again below, or browse a path and pick from the checklist — it's always
            up to date.
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
  if (!lesson) return <PageSkeleton />
  return <LessonWorkspace key={lesson.id} lesson={lesson} />
}

function LessonWorkspace({ lesson }: { lesson: Lesson }) {
  const navigate = useNavigate()
  const toast = useToast()
  // Destructured (all useCallback([])-stable in the progress engine) — the
  // actions literal is fresh every render, so depending on it churns the
  // memoized callbacks on every render.
  const [progress, { recordAttempt, completeLesson, saveCode, saveReflection }] = useProgress()

  // Stages come from the learning engine (objective → … → reflection).
  const stages = useMemo(() => (lesson.content ? lessonStages(lesson.content) : []), [lesson.content])
  const exerciseStage = stages.find((s) => s.kind === 'exercise')
  const exerciseId = exerciseStage?.kind === 'exercise' ? exerciseStage.exerciseId : null
  const reflectionStage = stages.find((s) => s.kind === 'reflection')
  const reflectPrompt = reflectionStage?.kind === 'reflection' ? reflectionStage.prompt : null

  const [exercise, setExercise] = useState<ExerciseContent | null>(null)
  const [exerciseMissing, setExerciseMissing] = useState(false)
  const [exerciseRetry, setExerciseRetry] = useState(0)
  const hintDeltaRef = useRef(0)

  useEffect(() => {
    if (!exerciseId) {
      setExercise(null)
      setExerciseMissing(false)
      return
    }
    let cancelled = false
    setExercise(null)
    setExerciseMissing(false)
    hintDeltaRef.current = 0
    getExercise(exerciseId).then((e) => {
      if (cancelled) return
      if (e?.content) setExercise(e.content)
      else setExerciseMissing(true)
    })
    return () => {
      cancelled = true
    }
  }, [exerciseId, exerciseRetry])

  const hintsState = useHints(exercise ?? EMPTY_EXERCISE)

  const [reflection, setReflection] = useState(() => progress.reflections[lesson.id] ?? '')
  const reflectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const codeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onReflectionChange = useCallback(
    (v: string) => {
      setReflection(v)
      if (reflectTimer.current) clearTimeout(reflectTimer.current)
      reflectTimer.current = setTimeout(() => saveReflection(lesson.id, v), 600)
    },
    [saveReflection, lesson.id]
  )

  // prev/next lesson navigation in the module's lesson order.
  const [siblings, setSiblings] = useState<LessonRef[]>([])
  useEffect(() => {
    let cancelled = false
    listLessons(lesson.moduleId).then((ls) => {
      if (!cancelled) setSiblings(ls)
    })
    return () => {
      cancelled = true
    }
  }, [lesson.moduleId])
  const idx = siblings.findIndex((l) => l.id === lesson.id)
  const prev = idx > 0 ? siblings[idx - 1] : undefined
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : undefined

  // Exercise workspace state. `code` falls back to the saved/starter code until
  // the first edit, so the async exercise fetch never races the editor value.
  const fallbackCode = exercise ? (progress.code[exercise.id] ?? exercise.starterCode ?? '') : ''
  const [typedCode, setTypedCode] = useState<string | null>(null)
  const code = typedCode ?? fallbackCode
  const [runResult, setRunResult] = useState<ExerciseRunResult | null>(null)
  const windowRef = useRef<HTMLElement | null>(null)
  const [running, setRunning] = useState(false)
  const [mcFailed, setMcFailed] = useState(false)
  const outputRef = useRef<HTMLDivElement | null>(null)

  const lessonDone =
    progress.lessons[lesson.id]?.status === 'passed' || progress.lessons[lesson.id]?.status === 'completed'
  const isMc = exercise !== null && exercise.type === 'multiple-choice'
  const mcGrading =
    isMc && exercise.options !== null && exercise.options.length > 0 && exercise.answerIndex !== null
  const hintFallback = exercise ? (exercise.expectedBehavior ?? exercise.referenceSolution) : undefined
  const hintsTotal = (exercise?.hints ?? []).length + (hintFallback !== undefined ? 1 : 0)
  const mapped = useMemo(() => (runResult ? toRunnerResult(runResult) : null), [runResult])

  const onCodeChange = useCallback(
    (v: string) => {
      setTypedCode(v)
      if (codeTimer.current) clearTimeout(codeTimer.current)
      const exerciseKey = exercise?.id ?? ''
      codeTimer.current = setTimeout(() => {
        if (exerciseKey) saveCode(exerciseKey, v)
      }, 600)
    },
    [saveCode, exercise]
  )

  useEffect(
    () => () => {
      if (reflectTimer.current) clearTimeout(reflectTimer.current)
      if (codeTimer.current) clearTimeout(codeTimer.current)
    },
    []
  )

  // The lesson exists but its content could not be read (missing or malformed
  // JSONB) — educational empty state, never a blank page.
  if (!lesson.content) {
    return (
      <div className="page page-wide">
        <PageHeader
          trail={[{ label: 'Paths', to: '/paths' }, { label: lesson.title }]}
          title={lesson.title}
        />
        <div className="empty">
          <h3>Lesson content unavailable</h3>
          <p>
            What happened: this lesson's content could not be read — it may be missing or
            malformed.
          </p>
          <p>
            Next step: browse a path and pick this lesson again, or continue with another lesson —
            your other progress is safe.
          </p>
          <Link className="btn btn-primary" to="/paths">
            Browse paths
          </Link>
        </div>
      </div>
    )
  }

  async function run() {
    if (!exercise) return
    setRunning(true)
    try {
      const r = await runExercise(exercise, code, runCode)
      setRunResult(r)
      if (!r.error && r.testResults.length > 0 && r.allPassed) {
        toast.push('success', 'Great job!', praiseFor())
      }
    } catch {
      toast.push(
        'error',
        'Run failed to start',
        'Something went wrong starting the runner. Reloading this page fixes it and keeps your code.'
      )
    } finally {
      setRunning(false)
      // bring the result into view so the learner sees what happened
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  function reset() {
    if (!exercise) return
    setTypedCode(exercise.starterCode ?? '')
    setRunResult(null)
    saveCode(exercise.id, exercise.starterCode ?? '')
  }

  function praiseFor() {
    const used = hintsState.hintLevel
    if (used === 0) return 'All checks green — first try, no hints. Well done.'
    if (used <= hintsTotal / 2) return 'Passed with just a nudge.'
    return 'Passed — and the hints did their job.'
  }

  // THE CRITICAL LOOP, steps 4–5 — submit: failed → attempted, allPassed →
  // passed + completed. recordAttempt carries hints used since the last
  // attempt (the progress store accumulates deltas), so pass/fail and hint
  // counts land correctly for guests and signed-in users alike.
  function submit() {
    if (!exercise) return
    if (!runResult) {
      toast.push('error', 'Run first', 'Run your code so the checks can run, then submit.')
      return
    }
    if (runResult.error || !runResult.allPassed) {
      if (!lessonDone) {
        recordAttempt(exercise.id, false, hintDeltaRef.current, lesson.id)
        hintDeltaRef.current = 0
      }
      toast.push(
        'error',
        'Something is still failing',
        'Read the failing check below the editor — it names exactly what is off.'
      )
      return
    }
    if (!lessonDone) {
      recordAttempt(exercise.id, true, hintDeltaRef.current, lesson.id)
      hintDeltaRef.current = 0
    }
    completeLesson(lesson.id)
    toast.push('success', 'Lesson complete!', next ? `Up next: ${next.title}` : 'Module complete — keep going.')
  }

  // Multiple-choice exercises grade inline: correct → attempt + completion,
  // wrong → one failed attempt recorded, then free retries without spamming.
  // A completed lesson records nothing further (options stay explorable).
  function onMcPick(i: number) {
    if (!exercise || exercise.answerIndex === null || lessonDone) return
    if (gradeMultipleChoice(exercise, i)) {
      recordAttempt(exercise.id, true, hintDeltaRef.current, lesson.id)
      hintDeltaRef.current = 0
      completeLesson(lesson.id)
      toast.push('success', 'Correct!', praiseFor())
    } else if (!mcFailed) {
      setMcFailed(true)
      recordAttempt(exercise.id, false, hintDeltaRef.current, lesson.id)
      hintDeltaRef.current = 0
    }
  }

  function revealHint() {
    hintsState.revealNext()
    hintDeltaRef.current += 1
  }

  // Lessons without an exercise complete here (the exercise Submit gates the
  // rest — that IS the critical loop).
  function finish() {
    completeLesson(lesson.id)
    if (reflectTimer.current) {
      clearTimeout(reflectTimer.current)
      reflectTimer.current = null
    }
    if (reflection.trim()) saveReflection(lesson.id, reflection.trim())
    toast.push('success', 'Lesson complete!', next ? `Up next: ${next.title}` : 'Module complete — keep going.')
  }

  function renderStage(stage: LessonStage) {
    switch (stage.kind) {
      case 'objective':
        return (
          <section className="panel panel-pad">
            <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
              Objective
            </p>
            <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.7, margin: 0 }}>{stage.text}</p>
          </section>
        )
      case 'explanation':
        return <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.7, margin: 0 }}>{stage.body}</p>
      case 'example':
        return (
          <section className="window">
            <div className="tabbar" aria-label="Example">
              <span className="tab" aria-selected="true">
                example{stage.language === 'python' ? '.py' : '.js'}
              </span>
            </div>
            <CodeBlock code={stage.code} />
            {stage.caption && (
              <p className="muted fs-12" style={{ padding: '0 var(--sp-4) var(--sp-3)', margin: 0 }}>
                {stage.caption}
              </p>
            )}
          </section>
        )
      case 'try-it':
        return <TryItBlock description={stage.description} language={stage.language} starterCode={stage.starterCode} />
      case 'question':
        return (
          <QuestionCheck
            prompt={stage.prompt}
            options={stage.options}
            answerIndex={stage.answerIndex}
            explanation={stage.explanation}
          />
        )
      case 'debugging':
        if (!stage.brokenCode) {
          return (
            <section className="panel panel-pad">
              <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
                Debug this
              </p>
              <p className="muted fs-14" style={{ margin: 0 }}>
                {stage.guidance ?? 'Find and fix the problem in the exercise below.'}
              </p>
            </section>
          )
        }
        return (
          <section className="window">
            <div className="tabbar" aria-label="Broken code">
              <span className="tab" aria-selected="true">
                debug-me{stage.language === 'python' ? '.py' : '.js'}
              </span>
            </div>
            <CodeBlock code={stage.brokenCode} />
            {stage.guidance && (
              <p
                className="muted fs-14"
                style={{ padding: 'var(--sp-3) var(--sp-4)', borderTop: '1px solid var(--border)', margin: 0 }}
              >
                Guidance: {stage.guidance}
              </p>
            )}
          </section>
        )
      case 'exercise':
        // The workspace itself lives in the right column; loading and missing
        // states are handled there. Here: instructions + progressive hints.
        if (!exercise) return null
        return (
          <>
            <section className="panel panel-pad">
              <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
                Instructions
              </p>
              <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {exercise.instructions}
              </p>
              {exercise.expectedBehavior && (
                <p className="muted fs-14" style={{ marginTop: 'var(--sp-3)', marginBottom: 0 }}>
                  Expected behavior: {exercise.expectedBehavior}
                </p>
              )}
            </section>
            {hintsTotal > 0 && (
              <HintStepper
                hints={exercise.hints ?? []}
                explanation={hintFallback ?? ''}
                revealed={hintsState.hintLevel}
                onReveal={revealHint}
              />
            )}
          </>
        )
      default:
        // Unknown block types pass through as data — skipped, never a crash.
        return null
    }
  }

  const stageList = stages.map((stage, i) => (
    <Fragment key={i}>{renderStage(stage)}</Fragment>
  ))

  return (
    <div className="page page-wide">
      <PageHeader
        trail={[{ label: 'Paths', to: '/paths' }, { label: lesson.title }]}
        title={lesson.title}
        badge={
          lessonDone ? (
            <span className="badge badge-success">
              <Icon name="check" size={12} /> done
            </span>
          ) : undefined
        }
      />

      {exerciseId !== null ? (
        <div className="workspace">
          {/* --- left column: stages, sized for reading --- */}
          <div className="workspace-side">{stageList}</div>

          {/* --- right column: editor + run/output always in the same view --- */}
          <section ref={windowRef} className="window" aria-label="Exercise workspace">
            {exercise ? (
              <>
                <div className="window-bar">
                  <div className="window-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="window-title">{fileNameFor(exercise.language)} — Devora</span>
                </div>
                <div className="tabbar" aria-label="Files">
                  <span className="tab" aria-selected="true">
                    {fileNameFor(exercise.language)}
                  </span>
                  <span style={{ marginLeft: 'auto' }} />
                </div>
                {mcGrading ? (
                  <div style={{ padding: 'var(--sp-4)', borderBottom: '1px solid var(--border)' }}>
                    <QuestionCheck
                      prompt={exercise.instructions}
                      options={exercise.options ?? []}
                      answerIndex={exercise.answerIndex ?? 0}
                      onPicked={onMcPick}
                    />
                  </div>
                ) : isMc ? (
                  <div style={{ padding: 'var(--sp-4)', borderBottom: '1px solid var(--border)' }} role="alert">
                    <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
                      Multiple choice
                    </p>
                    <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.7, margin: 0 }}>
                      What happened: this check can't be graded right now — its answer key is missing.
                    </p>
                    <p className="muted fs-14" style={{ marginTop: 'var(--sp-3)', marginBottom: 0 }}>
                      Next step: continue to the next lesson and come back later, or mention it to your
                      instructor.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Controls ABOVE the editor — always visible on mobile without scrolling */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--sp-2)',
                        padding: 'var(--sp-2) var(--sp-3)',
                        borderBottom: '1px solid var(--border)',
                        flexWrap: 'wrap'
                      }}
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Icon name="play" size={13} filled />}
                        onClick={run}
                        disabled={running}
                        style={{ minHeight: 44 }}
                      >
                        {running ? 'Running…' : 'Run'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Icon name="rotate" size={13} />}
                        onClick={reset}
                        style={{ minHeight: 44 }}
                      >
                        Reset
                      </Button>
                      <span style={{ flex: 1 }} />
                      <FullscreenButton targetRef={windowRef} />
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Icon name="flag" size={13} />}
                        onClick={submit}
                        style={{ minHeight: 44 }}
                      >
                        Submit
                      </Button>
                    </div>
                    <CodeEditor
                      value={code}
                      onChange={onCodeChange}
                      language={editorLanguage(exercise.language)}
                    />
                  </>
                )}
                {!isMc && (
                  <div ref={outputRef}>
                    <OutputBar result={mapped} running={running} />
                    {runResult?.error && <ErrorExplain error={runResult.error} />}
                    {mapped && <TestCases tests={mapped.tests} label="Checks — each passes or fails on its own" />}
                  </div>
                )}
              </>
            ) : exerciseMissing ? (
              <div style={{ padding: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-3)' }} role="alert">
                <p className="label" style={{ marginBottom: 0 }}>
                  Exercise unavailable
                </p>
                <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.7, margin: 0 }}>
                  What happened: the exercise for this lesson could not be loaded — it may be missing, or
                  the content service could not be reached.
                </p>
                <p className="muted fs-14" style={{ margin: 0 }}>
                  Next step: try again below; if it keeps failing, continue to the next lesson and come
                  back later — your other progress is safe.
                </p>
                <div className="row">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Icon name="rotate" size={13} />}
                    onClick={() => setExerciseRetry((n) => n + 1)}
                    style={{ minHeight: 44 }}
                  >
                    Try again
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-3)' }} aria-busy="true">
                <div className="skeleton" style={{ height: 16, width: '40%' }} />
                <div className="skeleton" style={{ height: 120 }} />
                <div className="skeleton" style={{ height: 44 }} />
              </div>
            )}
          </section>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--sp-4)', maxWidth: 780 }}>{stageList}</div>
      )}

      {/* --- reflect + prev/next: completes the loop explain → write → run → fix → reflect --- */}
      <section className="panel panel-pad section-gap" aria-label="Finish up">
        {reflectPrompt !== null && (
          <>
            <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
              Reflect (optional, one sentence)
            </p>
            <p className="muted fs-14" style={{ marginBottom: 'var(--sp-3)' }}>
              {reflectPrompt}
            </p>
            <textarea
              className="input"
              placeholder="In your own words…"
              value={reflection}
              onChange={(e) => onReflectionChange(e.target.value)}
              aria-label="Reflection answer"
            />
          </>
        )}
        <div className="row" style={{ marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
          {prev && (
            <Button
              variant="ghost"
              icon={<Icon name="arrowL" size={14} />}
              onClick={() => navigate(`/lesson/${prev.id}`)}
              style={{ minHeight: 44 }}
            >
              Previous
            </Button>
          )}
          {exerciseId === null && (
            <Button variant="primary" onClick={finish} style={{ minHeight: 44 }}>
              {lessonDone ? 'Keep progress' : 'Finish lesson'}
            </Button>
          )}
          {next && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/lesson/${next.id}`)}
              style={{ minHeight: 44 }}
            >
              Next lesson
              <Icon name="arrowR" size={14} />
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}

/** Inline editable try-it block (existing CodeEditor pattern). Local scratch
 *  state only — the checked exercise is what saves progress. */
function TryItBlock({
  description,
  language,
  starterCode
}: {
  description: string
  language?: string
  starterCode?: string
}) {
  const [code, setCode] = useState(() => starterCode ?? '')
  return (
    <section className="panel panel-pad">
      <p className="label" style={{ marginBottom: 'var(--sp-2)' }}>
        Try it
      </p>
      <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.7, marginBottom: 'var(--sp-3)' }}>{description}</p>
      <div style={{ height: 260 }}>
        <CodeEditor value={code} onChange={setCode} language={editorLanguage(language ?? null)} />
      </div>
      <p className="muted fs-12" style={{ marginTop: 'var(--sp-2)' }}>
        Scratch space — edit and experiment freely; the checked exercise below is what saves progress.
      </p>
    </section>
  )
}

/** Multiple-choice check, graded by the learning engine's grader. Formative by
 *  default (question stages); the exercise workspace passes onPicked to record
 *  attempts. Explanation reveals on a correct answer. */
function QuestionCheck({
  prompt,
  options,
  answerIndex,
  explanation,
  onPicked
}: {
  prompt: string
  options: string[]
  answerIndex: number
  explanation?: string
  onPicked?: (index: number) => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const correct = picked !== null && picked === answerIndex
  const wrong = picked !== null && picked !== answerIndex

  function pick(i: number) {
    setPicked(i)
    if (picked === i) return // same option already graded
    onPicked?.(i)
  }

  return (
    <section className="panel panel-pad">
      <p className="label" style={{ marginBottom: 'var(--sp-3)' }}>
        Quick check
      </p>
      <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.7, marginBottom: 'var(--sp-3)' }}>{prompt}</p>
      <div role="group" aria-label="Answer options" style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        {options.map((option, i) => (
          <button
            key={i}
            type="button"
            className="chip"
            aria-pressed={picked === i}
            onClick={() => pick(i)}
            style={{ justifyContent: 'flex-start', textAlign: 'left', color: picked === i ? undefined : 'var(--text)' }}
          >
            {option}
          </button>
        ))}
      </div>
      {correct && (
        <div className="hint-item" role="status" style={{ marginTop: 'var(--sp-3)' }}>
          <Icon name="check" size={13} />
          <span>
            <strong>Correct.</strong>
            {explanation ? ` ${explanation}` : ''}
          </span>
        </div>
      )}
      {wrong && (
        <p className="muted fs-14" role="alert" style={{ marginTop: 'var(--sp-3)', marginBottom: 0 }}>
          Not quite — that option isn't the right answer. Think it through once more and pick again; the
          explanation unlocks when you get it.
        </p>
      )}
    </section>
  )
}

function fileNameFor(language: string | null): string {
  switch (language) {
    case 'python':
      return 'main.py'
    case 'typescript':
      return 'main.ts'
    case 'html':
      return 'index.html'
    case 'css':
      return 'styles.css'
    default:
      return 'main.js'
  }
}

function editorLanguage(language: string | null): 'javascript' | 'html' | 'css' | 'python' {
  if (language === 'python' || language === 'html' || language === 'css') return language
  return 'javascript'
}

/** Local view of the shared OutputBar/TestCases prop shape, mapped from the
 *  learning engine's ExerciseRunResult at this call site. Structurally the
 *  components' prop type (they still serve pages on the legacy runner until
 *  Task 12) — declared here so this page imports no old-lib module. */
interface ResultView {
  logs: { type: 'log' | 'error' | 'warn'; text: string }[]
  tests: { name: string; passed: boolean; detail?: string }[]
  error?: { message: string; hint: string }
  exitCode: 0 | 1
}

/** Maps the learning engine's ExerciseRunResult onto the shared OutputBar/
 *  TestCases prop shape — mapped at this call site so those components keep
 *  serving the other pages still on the legacy runner. Failure detail shows
 *  expected vs actual per case; the engine's stdin/stdout run model has no
 *  program console logs, so ConsoleLogs is not used here. */
function toRunnerResult(r: ExerciseRunResult): ResultView {
  return {
    logs: [],
    tests: r.testResults.map((t) => ({
      name: t.description,
      passed: t.passed,
      detail: t.passed
        ? undefined
        : [
            t.stdin ? `Input: ${t.stdin}` : null,
            `Expected: ${t.expectedOutput}`,
            t.actualOutput === null ? 'Not run — the program stopped first.' : `Got: ${t.actualOutput}`
          ]
            .filter((part): part is string => part !== null)
            .join(' · ')
    })),
    error: r.error ? { message: r.error.message, hint: r.error.expected } : undefined,
    exitCode: r.error || !r.allPassed ? 1 : 0
  }
}
