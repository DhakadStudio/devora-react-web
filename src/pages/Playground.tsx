import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { CodeEditor } from '../components/CodeEditor'
import { ConsoleLogs } from '../components/OutputBar'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { TEMPLATES, useSnippets, type SnippetFiles } from '../lib/snippets'
import { runJavaScript, htmlSrcdoc, type RunResult, type ConsoleEntry } from '../lib/runner'
import { useToast } from '../components/Toast'
import { FullscreenButton } from '../components/FullscreenButton'
import { useProgress } from '../lib/progress'

type Mode = 'javascript' | 'web'
type WebFile = keyof SnippetFiles

const WEB_TABS: { id: WebFile; label: string; lang: 'html' | 'css' | 'javascript' }[] = [
  { id: 'html', label: 'index.html', lang: 'html' },
  { id: 'css', label: 'style.css', lang: 'css' },
  { id: 'js', label: 'script.js', lang: 'javascript' }
]

const EMPTY_WEB: SnippetFiles = { html: '<h1>My page</h1>\n', css: '', js: '' }

export function Playground() {
  const toast = useToast()
  const [{ items }, ops] = useSnippets()
  const [, progressOps] = useProgress()

  const [template, setTemplate] = useState<string>(TEMPLATES[0].id)
  const [name, setName] = useState('scratch.js')
  const [code, setCode] = useState(TEMPLATES[0].code) // javascript mode
  const [files, setFiles] = useState<SnippetFiles>(EMPTY_WEB) // web mode
  const [activeFile, setActiveFile] = useState<WebFile>('html')
  const [result, setResult] = useState<RunResult | null>(null)
  const [previewLogs, setPreviewLogs] = useState<ConsoleEntry[]>([])
  const [previewKey, setPreviewKey] = useState(0) // bump to force iframe refresh
  const [running, setRunning] = useState(false)
  const [dirty, setDirty] = useState(false)
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewRef = useRef<HTMLIFrameElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outputRef = useRef<HTMLDivElement | null>(null)
  const savedRef = useRef<HTMLElement | null>(null)

  const activeTemplate = TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0]
  const mode: Mode = activeTemplate.language === 'web' ? 'web' : 'javascript'

  /* ---- template / dropdown ---- */
  function pickTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id)
    if (!t) return
    setTemplate(id)
    setCode(t.code)
    setFiles(t.files ?? EMPTY_WEB)
    setActiveFile('html')
    setResult(null)
    setPreviewLogs([])
    setDirty(false)
    setPreviewKey((k) => k + 1)
    setName(t.language === 'web' ? 'my-page' : 'scratch.js')
  }

  function loadSnippet(s: (typeof items)[number]) {
    const isWeb = s.language === 'web'
    const match = TEMPLATES.find((t) => t.language === (isWeb ? 'web' : 'javascript'))
    setTemplate(match?.id ?? TEMPLATES[0].id)
    if (isWeb) {
      setFiles(s.files ?? { ...EMPTY_WEB, html: s.code })
      setActiveFile('html')
      setPreviewKey((k) => k + 1)
    } else {
      setCode(s.code)
    }
    setName(s.name)
    setDirty(false)
    setPreviewLogs([])
    toast.push('info', 'Loaded in the editor', `"${s.name}" is now editable above.`)
  }

  /* ---- editing ---- */
  const markDirty = useCallback(() => {
    setDirty(true)
    if (saveRef.current) clearTimeout(saveRef.current)
    saveRef.current = setTimeout(() => setDirty(false), 2000)
  }, [])

  const onCodeChange = useCallback(
    (v: string) => {
      setCode(v)
      markDirty()
    },
    [markDirty]
  )

  const onFileChange = useCallback(
    (v: string) => {
      setFiles((f) => ({ ...f, [activeFile]: v }))
      markDirty()
      // web preview refreshes on edit, debounced (typing never steals focus)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => setPreviewKey((k) => k + 1), 600)
    },
    [activeFile, markDirty]
  )

  /* ---- console piped out of the preview iframe ---- */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== previewRef.current?.contentWindow) return
      const data = e.data as { kind?: string; type?: ConsoleEntry['type']; text?: string }
      if (data?.kind !== 'devora-console' || typeof data.text !== 'string') return
      setPreviewLogs((logs) => [...logs.slice(-199), { type: data.type ?? 'log', text: data.text! }])
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  /* ---- run ---- */
  async function run() {
    progressOps.recordActivity()
    if (mode === 'web') {
      setPreviewLogs([])
      setPreviewKey((k) => k + 1)
      return
    }
    setRunning(true)
    try {
      setResult(await runJavaScript(code))
    } catch {
      toast.push('error', 'Run failed to start', 'Reload the page — your code stays on screen either way.')
    } finally {
      setRunning(false)
      // bring the output into view so the result is never hidden off-screen
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  function saveAs() {
    const trimmed = name.trim() || 'untitled'
    if (mode === 'web') {
      ops.save({ name: trimmed, language: 'web', code: files.html, files })
    } else {
      ops.save({ name: trimmed, language: 'javascript', code })
    }
    progressOps.recordActivity()
    toast.push('success', 'Saved', `"${trimmed}" is in your projects — find it on Home or Profile.`)
    setDirty(false)
    // scroll to the saved list so the learner sees where their project went
    savedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  useEffect(
    () => () => {
      if (saveRef.current) clearTimeout(saveRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    []
  )


  const activeTab = WEB_TABS.find((t) => t.id === activeFile)!

  return (
    <div className="page page-wide">
      <PageHeader
        trail={[{ label: 'Playground' }]}
        title="Playground"
        sub="No lesson here. Just you, an editor, and the run button. Web mode runs HTML, CSS and JS together in one live preview."
      />

      <div className="row" style={{ marginBottom: 'var(--sp-4)', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        {/* Real dropdown — one control for language + starter template */}
        <label className="select-wrap">
          <span className="sr-only">Choose a language and starter template</span>
          <select className="select mono" value={template} onChange={(e) => pickTemplate(e.target.value)}>
            <optgroup label="JavaScript (console)">
              {TEMPLATES.filter((t) => t.language === 'javascript').map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Web page (live preview)">
              {TEMPLATES.filter((t) => t.language === 'web').map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </select>
          <Icon name="chevronD" size={14} />
        </label>

        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          <input
            className="input mono"
            style={{ maxWidth: 180, minHeight: 40, fontSize: 'var(--fs-14)' }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Project name"
            spellCheck={false}
          />
          <Button variant="secondary" size="sm" icon={<Icon name="save" size={14} />} onClick={saveAs} title={dirty ? 'You have unsaved changes — save to keep this version' : 'No unsaved changes'} style={{ minHeight: 44 }}>
            {dirty ? 'Save — unsaved changes' : 'Save'}
          </Button>
        </div>
      </div>

      <section className="window" aria-label="Playground editor" style={{ minHeight: '60dvh' }}>
        <div className="window-bar">
          <div className="window-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="window-title">{name} — Devora</span>
          <span className="window-title row-end">{mode === 'web' ? 'live preview' : 'console output'}</span>
        </div>

        {/* File tabs — web mode shows all three files at once */}
        {mode === 'web' ? (
          <div className="tabbar" role="tablist" aria-label="Files">
            {WEB_TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeFile === t.id}
                className={activeFile === t.id ? 'tab is-active' : 'tab'}
                onClick={() => setActiveFile(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="tabbar" aria-label="File">
            <span className="tab is-active" aria-selected="true">
              {name.endsWith('.js') ? name : `${name}.js`}
            </span>
          </div>
        )}

        {/* Controls ABOVE the editor — visible on mobile without scrolling */}
        <div className="editor-controls" style={{ display: 'flex', gap: 'var(--sp-2)', padding: 'var(--sp-2) var(--sp-3)', borderBottom: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" icon={<Icon name="play" size={13} filled />} onClick={run} disabled={running} style={{ minHeight: 44 }}>
            {mode === 'web' ? 'Refresh preview' : running ? 'Running…' : 'Run'}
          </Button>
          <span style={{ flex: 1 }} />
          <FullscreenButton />
        </div>

        <div className="workspace" style={{ alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 320 }}>
            {mode === 'web' ? (
              <CodeEditor key={activeFile} value={files[activeFile]} onChange={onFileChange} language={activeTab.lang} />
            ) : (
              <CodeEditor value={code} onChange={onCodeChange} language="javascript" />
            )}
          </div>
          <div ref={outputRef} style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', minHeight: 320 }}>
            {mode === 'web' ? (
              <>
                <iframe
                  key={previewKey}
                  ref={previewRef}
                  title="Preview"
                  sandbox="allow-scripts"
                  style={{ flex: 1, border: 0, background: '#fff', minHeight: 240 }}
                  srcDoc={htmlSrcdoc(files.html, files.css, files.js)}
                />
                {previewLogs.length > 0 && <ConsoleLogs result={{ logs: previewLogs, tests: [], exitCode: 0 }} />}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className="output-bar">
                  <span className="output-quiet">console</span>
                </div>
                {result ? (
                  <ConsoleLogs result={result} />
                ) : (
                  <p className="muted fs-12 mono" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                    Run the file to see output.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="output-bar" style={{ justifyContent: 'space-between' }}>
          <span className="output-quiet">{mode === 'web' ? 'auto-preview on edit' : running ? 'running…' : 'idle'}</span>
        </div>
      </section>

      {items.length > 0 && (
        <section className="section-gap" ref={savedRef}>
          <h2 className="page-title" style={{ fontSize: 'var(--fs-20)', marginTop: 0 }}>
            Your saved projects
          </h2>
          <div className="grid grid-3 section-gap">
            {items.map((s) => (
              <div key={s.id} className="panel panel-pad" style={{ display: 'grid', gap: 'var(--sp-3)' }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
                  <span className="card-title mono" style={{ fontSize: 'var(--fs-14)' }}>
                    {s.name}
                  </span>
                  <span className="badge">{s.language === 'web' ? 'web · 3 files' : 'js'}</span>
                </div>
                <p className="muted fs-12 mono">{new Date(s.updatedAt).toLocaleDateString()}</p>
                <div className="row" style={{ gap: 'var(--sp-2)' }}>
                  <Button variant="secondary" size="sm" onClick={() => loadSnippet(s)}>
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Icon name="trash" size={13} />}
                    onClick={() => {
                      ops.remove(s.id)
                      toast.push('info', 'Deleted', `"${s.name}" removed.`)
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
