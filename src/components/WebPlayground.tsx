import { useCallback, useEffect, useRef, useState } from 'react'
import { CodeEditor } from './CodeEditor'
import { attachEditorZoom } from '../lib/editorZoom'

/**
 * A single linked web workspace: 3 editor tabs that all feed ONE live
 * preview, so learners build real pages — give an element an id in HTML,
 * style that id in CSS, and grab it with document.getElementById in JS —
 * instead of ever editing one language in isolation.
 *
 * File switching lives in the row directly above the editor (the same row
 * that names the current file) — the active file is always the bright one,
 * like real editor tabs. Nothing else needs the toolbar for it.
 *
 * Mobile: editor and preview are full-height panes behind two buttons —
 * Code and Preview — with Run next to them; pressing Run jumps to the
 * preview, and the Code button brings the editor back. Both panes stay
 * mounted so editor contents survive switching.
 *
 * Font size and autocomplete arrive from the surrounding Workbench's
 * settings menu as props, so the toolbar stays one short line.
 */

const SAMPLE_HTML = `<h1 id="title">Hello, Devora!</h1>
<p>Edit the HTML, CSS and JS tabs — they all talk to each other.</p>
<button id="btn">Click me</button>
<p id="output"></p>`

const SAMPLE_CSS = `body { font-family: sans-serif; padding: 1.5rem; }
#title { color: #0891b2; }
#btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: #0891b2;
  color: #fff;
  cursor: pointer;
}`

const SAMPLE_JS = `// This JS can reach into the HTML above using the same id.
const btn = document.getElementById("btn");
const output = document.getElementById("output");
let clicks = 0;

btn.addEventListener("click", () => {
  clicks++;
  output.textContent = "Clicked " + clicks + " time(s)!";
});`

type FileId = 'html' | 'css' | 'js'

const FILES: { id: FileId; label: string; lang: string; sample: string }[] = [
  { id: 'html', label: 'index.html', lang: 'html', sample: SAMPLE_HTML },
  { id: 'css', label: 'style.css', lang: 'css', sample: SAMPLE_CSS },
  { id: 'js', label: 'script.js', lang: 'javascript', sample: SAMPLE_JS }
]

function draftKey(file: FileId): string {
  return `devora-playground-web-${file}`
}

function loadDraft(file: FileId): string {
  try {
    return localStorage.getItem(draftKey(file)) ?? FILES.find((f) => f.id === file)!.sample
  } catch {
    return FILES.find((f) => f.id === file)!.sample
  }
}

function saveDraft(file: FileId, code: string): void {
  try {
    localStorage.setItem(draftKey(file), code)
  } catch {}
}

function clearDrafts(): void {
  for (const f of FILES) {
    try {
      localStorage.removeItem(draftKey(f.id))
    } catch {}
  }
}

export function WebPlayground({
  fontSize,
  onFontSizeChange,
  autocomplete,
  readOnly
}: {
  fontSize: number
  onFontSizeChange?: (n: number) => void
  autocomplete?: boolean
  readOnly?: boolean
}) {
  const [codes, setCodes] = useState<Record<FileId, string>>(() => ({
    html: loadDraft('html'),
    css: loadDraft('css'),
    js: loadDraft('js')
  }))
  const [activeFile, setActiveFile] = useState<FileId>('html')
  const [mobilePane, setMobilePane] = useState<'code' | 'preview'>('code')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const editorHostRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return attachEditorZoom(
      editorHostRef.current,
      () => fontSize,
      (n) => onFontSizeChange?.(n)
    )
  }, [fontSize, onFontSizeChange])

  const runPreview = useCallback((current: Record<FileId, string>) => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = `<!DOCTYPE html>
<html>
<head>
<style>${current.css}</style>
</head>
<body>
${current.html}
<script>${current.js}<\/script>
</body>
</html>`
    }
  }, [])

  useEffect(() => {
    runPreview(codes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onCodeChange = useCallback(
    (v: string) => {
      setCodes((prev) => {
        const next = { ...prev, [activeFile]: v }
        saveDraft(activeFile, v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => runPreview(next), 500)
        return next
      })
    },
    [activeFile, runPreview]
  )

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    []
  )

  const active = FILES.find((f) => f.id === activeFile)!

  function runAndShowPreview() {
    runPreview(codes)
    setMobilePane('preview')
  }

  function resetActive() {
    setCodes((prev) => {
      const next = { ...prev, [activeFile]: active.sample }
      for (const f of FILES) saveDraft(f.id, next[f.id])
      runPreview(next)
      return next
    })
    clearDrafts()
  }

  return (
    <div className="webplay">
      {/* Desktop toolbar row: hint + Reset/Run (hidden on mobile — the same
          controls live on the Code/Preview row below). */}
      <div className="webplay-toolbar">
        <span className="term-prompt-inline">Auto-saved in this browser</span>
        <div className="webplay-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetActive}>
            Reset
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            data-sd-run-trigger
            onClick={runAndShowPreview}
          >
            Run
          </button>
        </div>
      </div>

      {/* Code/Preview row (mobile only): pane buttons + Reset/Run beside them. */}
      <div className="webplay-pane-tabs" role="tablist" aria-label="Playground panes">
        <button
          type="button"
          className="webplay-pane-tab"
          role="tab"
          aria-selected={mobilePane === 'code'}
          aria-pressed={mobilePane === 'code'}
          onClick={() => setMobilePane('code')}
        >
          Code
        </button>
        <button
          type="button"
          className="webplay-pane-tab"
          role="tab"
          aria-selected={mobilePane === 'preview'}
          aria-pressed={mobilePane === 'preview'}
          onClick={() => setMobilePane('preview')}
        >
          Preview
        </button>
        <div className="webplay-pane-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetActive} aria-label="Reset code to sample">
            Reset
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={runAndShowPreview}>
            Run
          </button>
        </div>
      </div>

      <div className="webplay-body">
        <div className={`webplay-pane${mobilePane !== 'code' ? ' is-pane-hidden' : ''}`}>
          {/* File tabs live in the row that names the current file. */}
          <div className="webplay-file-tabs" role="tablist" aria-label="Files">
            {FILES.map((f) => (
              <button
                key={f.id}
                type="button"
                className="webplay-file-tab"
                role="tab"
                aria-selected={activeFile === f.id}
                aria-pressed={activeFile === f.id}
                onClick={() => setActiveFile(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div ref={editorHostRef} className="webplay-editor-host">
            <CodeEditor
              value={codes[activeFile]}
              onChange={onCodeChange}
              language={active.lang}
              readOnly={readOnly}
              autocomplete={autocomplete}
              fontSize={fontSize}
              onFontSizeChange={onFontSizeChange}
            />
          </div>
        </div>

        <div className={`webplay-pane${mobilePane !== 'preview' ? ' is-pane-hidden' : ''}`}>
          <div className="webplay-file-tabs" role="tablist" aria-label="Preview">
            <span className="webplay-file-tab is-static">Preview</span>
          </div>
          <div className="webplay-preview-host">
            <iframe
              ref={iframeRef}
              title="Live preview of your HTML, CSS and JS"
              sandbox="allow-scripts"
              className="webplay-preview"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
