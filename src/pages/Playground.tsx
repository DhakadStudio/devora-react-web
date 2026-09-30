import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { CodeEditor } from '../components/CodeEditor'
import { ErrorExplain } from '../components/OutputBar'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { FullscreenButton } from '../components/FullscreenButton'
import { runCode, type ExecResult } from '../engines/execution'

type PlaygroundLanguage =
  | 'javascript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'csharp'
  | 'go'
  | 'ruby'
  | 'php'

const LANGUAGES: { id: PlaygroundLanguage; label: string }[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
  { id: 'csharp', label: 'C#' },
  { id: 'go', label: 'Go' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'php', label: 'PHP' }
]

const STARTER: Record<PlaygroundLanguage, string> = {
  javascript: 'console.log("Hello, Devora")\n',
  python: 'print("Hello, Devora")\n',
  java: 'class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Devora");\n  }\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hello, Devora" << std::endl;\n  return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n  printf("Hello, Devora\\n");\n  return 0;\n}\n',
  csharp: 'class Hello {\n  static void Main() {\n    System.Console.WriteLine("Hello, Devora");\n  }\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, Devora")\n}\n',
  ruby: 'puts "Hello, Devora"\n',
  php: '<?php\necho "Hello, Devora";\n'
}

const FILE_NAMES: Record<PlaygroundLanguage, string> = {
  javascript: 'main.js',
  python: 'main.py',
  java: 'Main.java',
  cpp: 'main.cpp',
  c: 'main.c',
  csharp: 'Hello.cs',
  go: 'main.go',
  ruby: 'main.rb',
  php: 'index.php'
}

function fileNameFor(language: PlaygroundLanguage): string {
  return FILE_NAMES[language]
}

/** Per-language draft drafts — plain localStorage keys, NOT the progress
 *  engine: the playground is scratch space, so its saves stay separate from
 *  lesson progress. */
function draftKey(language: PlaygroundLanguage): string {
  return `devora-playground-${language}`
}

function loadDraft(language: PlaygroundLanguage): string {
  try {
    return localStorage.getItem(draftKey(language)) ?? STARTER[language]
  } catch {
    return STARTER[language] // storage off → starter code on screen
  }
}

function saveDraft(language: PlaygroundLanguage, code: string): void {
  try {
    localStorage.setItem(draftKey(language), code)
  } catch {
    /* storage off — the draft stays on screen until Reset */
  }
}

function clearDraft(language: PlaygroundLanguage): void {
  try {
    localStorage.removeItem(draftKey(language))
  } catch {
    /* storage off — nothing to clear */
  }
}

export function Playground() {
  const [language, setLanguage] = useState<PlaygroundLanguage>('javascript')
  const [code, setCode] = useState(() => loadDraft('javascript'))
  const [result, setResult] = useState<ExecResult | null>(null)
  const windowRef = useRef<HTMLElement | null>(null)
  const [running, setRunning] = useState(false)
  // Sequence guard: switching language while a run is in flight makes that
  // run's result stale — it never lands in the new language's pane.
  const runSeqRef = useRef(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outputRef = useRef<HTMLDivElement | null>(null)

  // Language switch: load that language's draft, drop the previous result.
  useEffect(() => {
    setCode(loadDraft(language))
    setResult(null)
  }, [language])

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    },
    []
  )

  const onCodeChange = useCallback(
    (v: string) => {
      setCode(v)
      // Debounced draft save — the timer captures the language it was typed
      // in, so a quick language switch still persists the right draft.
      if (saveTimer.current) clearTimeout(saveTimer.current)
      const lang = language
      saveTimer.current = setTimeout(() => saveDraft(lang, v), 600)
    },
    [language]
  )

  function pickLanguage(id: string) {
    if (id !== 'javascript' && id !== 'python') return
    setLanguage(id)
  }

  function reset() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    setCode(STARTER[language])
    setResult(null)
    clearDraft(language)
  }

  // Runs through the execution engine ONLY — javascript → browser provider,
  // python → judge0. The page never constructs provider requests itself.
  async function run() {
    const seq = ++runSeqRef.current
    setRunning(true)
    try {
      const r = await runCode({ language, code })
      if (runSeqRef.current === seq) setResult(r)
    } catch {
      if (runSeqRef.current === seq) {
        setResult({
          status: 'runtime-error',
          stdout: '',
          stderr: '',
          error: {
            message: 'The run could not start.',
            expected: 'a reachable code runner',
            nextStep: 'Reload the page and press Run again — your draft stays on screen either way.'
          }
        })
      }
    } finally {
      if (runSeqRef.current === seq) setRunning(false)
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  return (
    <div className="page page-wide">
      <PageHeader
        trail={[{ label: 'Playground' }]}
        title="Playground"
        sub="No lesson here. Just you, an editor, and the run button. Your draft saves itself per language as you type."
      />

      <div
        className="lang-strip"
        role="group"
        aria-label="Playground language"
        style={{ marginBottom: 'var(--sp-4)' }}
      >
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            type="button"
            className="lang-tab"
            aria-pressed={language === l.id}
            onClick={() => pickLanguage(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <section ref={windowRef} className="window" aria-label="Playground editor" style={{ minHeight: '60dvh' }}>
        <div className="window-bar">
          <div className="window-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="window-title">{fileNameFor(language)} — Devora</span>
          <span className="window-title row-end">console output</span>
        </div>

        <div className="tabbar" aria-label="File">
          <span className="tab is-active" aria-selected="true">
            {fileNameFor(language)}
          </span>
        </div>

        {/* Controls ABOVE the editor — visible on mobile without scrolling */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--sp-2)',
            padding: 'var(--sp-2) var(--sp-3)',
            borderBottom: '1px solid var(--border)',
            alignItems: 'center',
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
            disabled={running}
            style={{ minHeight: 44 }}
          >
            Reset
          </Button>
          <span style={{ flex: 1 }} />
          <FullscreenButton targetRef={windowRef} />
        </div>

        <div className="workspace" style={{ alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 320 }}>
            <CodeEditor value={code} onChange={onCodeChange} language={language} />
          </div>
          <div
            ref={outputRef}
            style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', minHeight: 320 }}
          >
            <div className="output-bar" role="status" aria-live="polite">
              {running && (
                <span className="output-quiet">
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Running…
                </span>
              )}
              {!running && !result && <span className="output-quiet">Run the file to see output.</span>}
              {!running && result && !result.error && result.status === 'ok' && (
                <span className="output-ok">
                  <Icon name="check" size={13} /> Ran without errors
                </span>
              )}
              {!running && result && result.error && (
                <span className="output-err">
                  <Icon name="alert" size={13} /> Stopped
                </span>
              )}
            </div>
            {result?.error ? (
              <ErrorExplain error={result.error} />
            ) : result && !running ? (
              <pre className="output-logs" aria-label="Console output">
                {result.stdout.trim() === '' && result.stderr.trim() === '' ? (
                  <div className="muted">(no output — try a console.log / print)</div>
                ) : (
                  <>
                    {result.stdout.trim() !== '' &&
                      result.stdout.replace(/\n$/, '').split('\n').map((line, i) => <div key={`o${i}`}>{line}</div>)}
                    {result.stderr.trim() !== '' &&
                      result.stderr.replace(/\n$/, '').split('\n').map((line, i) => (
                        <div key={`e${i}`} className="err">
                          {line}
                        </div>
                      ))}
                  </>
                )}
              </pre>
            ) : (
              <p className="muted fs-12 mono" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                Run the file to see output.
              </p>
            )}
          </div>
        </div>

        <div className="output-bar" style={{ justifyContent: 'space-between' }}>
          <span className="output-quiet">{running ? 'running…' : 'idle'}</span>
          <span className="output-quiet">draft saves as you type</span>
        </div>
      </section>
    </div>
  )
}
