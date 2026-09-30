import { useCallback, useEffect, useRef, useState } from 'react'
import { CodeEditor, type EditorApi } from './CodeEditor'
import { WebPlayground } from './WebPlayground'
import { Terminal } from './Terminal'
import { Icon } from './Icon'
import { createInteractiveRunner, type InteractiveRunner } from '../engines/execution'
import {
  WORKBENCH_LANGUAGES,
  WEB_PLAYGROUND_ID,
  getWorkbenchLanguage,
  type WorkbenchLanguage
} from '../engines/execution/languages'
import { clampFont } from '../lib/editorZoom'

/**
 * The ONE editor for everything — a React port of the original Vue
 * implementation (OnlineEditor.vue, the standalone multi-language IDE):
 *
 * ONE language picker holds everything: the combined "HTML + CSS + JS"
 * playground entry (pinned first, with a badge) PLUS every server-executed
 * language (16 verified Judge0 languages, run through the interactive
 * terminal — output and dynamic input in one console).
 *
 * Toolbar = one compact row: language picker on the left, Run/Reset +
 * fullscreen + the settings gear on the right. The settings dropdown gathers
 * everything that used to occupy toolbar space: font size (A−/A+ with px),
 * autocomplete on/off, read-only on/off, and "Format code".
 *
 * Mobile model: instead of stacking editor above output (which forces sliding
 * up and down on every run), each side is a full-height pane behind two
 * buttons — the filename and Output — with Run and Reset right on that row.
 * Pressing Run always jumps to Output; the filename button brings the editor
 * back. Both panes stay mounted so editor contents and program state survive
 * switching.
 *
 * Fullscreen = a CSS-class toggle (position: fixed; inset: 0) — the whole
 * workbench becomes the screen.
 */

function draftKey(id: string): string {
  return `devora-playground-${id}`
}

function loadDraft(id: string): string {
  const lang = getWorkbenchLanguage(id)
  try {
    return localStorage.getItem(draftKey(id)) ?? (lang?.sample ?? '')
  } catch {
    return lang?.sample ?? ''
  }
}

function saveDraft(id: string, code: string): void {
  try {
    localStorage.setItem(draftKey(id), code)
  } catch {}
}

function clearDraft(id: string): void {
  try {
    localStorage.removeItem(draftKey(id))
  } catch {}
}

export function Workbench() {
  const [selectedId, setSelectedId] = useState<string>(WEB_PLAYGROUND_ID)
  const [fontSize, setFontSize] = useState(14)
  const [autocomplete, setAutocomplete] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [mobilePane, setMobilePane] = useState<'code' | 'output'>('code')
  const [started, setStarted] = useState(false)
  const [running, setRunning] = useState(false)
  const [, setAwaitingInput] = useState(false)
  const [runnerVersion, setRunnerVersion] = useState(0)

  const isWebPlayground = selectedId === WEB_PLAYGROUND_ID
  const selectedLang: WorkbenchLanguage | null = getWorkbenchLanguage(selectedId)
  const selectedLabel = isWebPlayground ? 'HTML + CSS + JS' : (selectedLang?.label ?? '')

  const codeRef = useRef('')
  codeRef.current = isWebPlayground ? '' : (codeRef.current ?? '')
  const editorApiRef = useRef<EditorApi | null>(null)
  const runnerRef = useRef<InteractiveRunner | null>(null)

  // The interactive runner is created per language so collected input never
  // leaks across languages. Every language runs through judge0 (uniform
  // terminal experience: JavaScript on Node, everything else compiled).
  useEffect(() => {
    if (isWebPlayground || !selectedLang) {
      runnerRef.current = null
      setRunnerVersion((v) => v + 1)
      return
    }
    const lang = selectedLang
    runnerRef.current = createInteractiveRunner({
      language: lang.id,
      provider: 'judge0',
      getCode: () => codeRef.current
    })
    setRunnerVersion((v) => v + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    if (runnerRef.current) {
      setAwaitingInput(runnerRef.current.isAwaitingInput())
    }
  }, [runnerVersion])

  // Fullscreen: Escape exits (the browser's native Esc for CSS-fixed overlays
  // needs a keydown listener).
  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  // Tap anywhere outside a picker/menu closes them.
  useEffect(() => {
    if (!langMenuOpen && !settingsOpen) return
    const close = () => {
      setLangMenuOpen(false)
      setSettingsOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [langMenuOpen, settingsOpen])

  const selectLanguage = useCallback((id: string) => {
    setSelectedId(id)
    setLangMenuOpen(false)
    setMobilePane('code') // a fresh language always starts on its code
    setStarted(false)
    setAwaitingInput(false)
    if (id === WEB_PLAYGROUND_ID) return
    codeRef.current = loadDraft(id)
  }, [])

  const onCodeChange = useCallback(
    (v: string) => {
      codeRef.current = v
      if (!isWebPlayground) saveDraft(selectedId, v)
    },
    [isWebPlayground, selectedId]
  )

  const run = useCallback(() => {
    setStarted(true)
    setMobilePane('output') // Run always lands on the output pane (mobile)
    const runner = runnerRef.current
    if (!runner) return
    setRunning(true)
    void runner.run().finally(() => {
      setRunning(false)
      setAwaitingInput(runner.isAwaitingInput())
    })
  }, [])

  const reset = useCallback(() => {
    setStarted(false)
    setAwaitingInput(false)
    runnerRef.current?.reset()
    const lang = selectedLang
    if (!lang) return
    // Undoable whole-file replacement (NOT setValue, which wipes the undo
    // stack) — pressing Undo afterwards restores the code the learner had.
    if (editorApiRef.current) {
      editorApiRef.current.replaceWholeText(lang.sample)
      codeRef.current = lang.sample
    } else {
      codeRef.current = lang.sample
    }
    clearDraft(selectedId)
  }, [selectedLang, selectedId])

  const formatActive = useCallback(() => {
    if (isWebPlayground) return
    editorApiRef.current?.format()
    setSettingsOpen(false)
  }, [isWebPlayground])

  const editorValue = isWebPlayground ? '' : (codeRef.current || selectedLang?.sample || '')

  return (
    <div className={`workbench${isFullscreen ? ' workbench-fullscreen' : ''}`}>
      {/* One compact toolbar row: language on the left; fullscreen + settings
          (and desktop Run/Reset) on the right. */}
      <div className="workbench-toolbar">
        <div className="workbench-lang-picker">
          <button
            type="button"
            className="workbench-lang-btn"
            aria-expanded={langMenuOpen}
            aria-haspopup="menu"
            aria-label={`Language: ${selectedLabel}`}
            onClick={(e) => {
              e.stopPropagation()
              setLangMenuOpen((v) => !v)
              setSettingsOpen(false)
            }}
          >
            <span className="workbench-lang-dot" aria-hidden="true" />
            {selectedLabel}
            <Icon name="chevronD" size={13} />
          </button>
          {langMenuOpen && (
            <div className="workbench-lang-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`workbench-lang-item is-playground${selectedId === WEB_PLAYGROUND_ID ? ' active' : ''}`}
                role="menuitem"
                onClick={() => selectLanguage(WEB_PLAYGROUND_ID)}
              >
                HTML + CSS + JS <span className="workbench-badge">Playground</span>
              </button>
              {WORKBENCH_LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`workbench-lang-item${selectedId === l.id ? ' active' : ''}`}
                  role="menuitem"
                  onClick={() => selectLanguage(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="workbench-toolbar-right">
          {!isWebPlayground && (
            <div className="workbench-actions workbench-toolbar-run-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
                Reset
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={running} onClick={run}>
                <Icon name="play" size={12} filled />
                {running ? 'Running…' : 'Run'}
              </button>
            </div>
          )}

          <button
            type="button"
            className="workbench-icon-btn"
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Open fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
            aria-pressed={isFullscreen}
            onClick={() => setIsFullscreen((v) => !v)}
          >
            <Icon name={isFullscreen ? 'minimize' : 'maximize'} size={15} />
          </button>

          {/* Settings: font size, autocomplete, read-only, Format — all in one
              dropdown so the toolbar stays a single short line. */}
          <div className="workbench-settings">
            <button
              type="button"
              className={`workbench-icon-btn${settingsOpen ? ' is-open' : ''}`}
              title="Editor settings"
              aria-label="Editor settings"
              aria-expanded={settingsOpen}
              aria-haspopup="menu"
              onClick={(e) => {
                e.stopPropagation()
                setSettingsOpen((v) => !v)
                setLangMenuOpen(false)
              }}
            >
              <Icon name="settings" size={15} />
            </button>
            {settingsOpen && (
              <div className="workbench-settings-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                <div className="workbench-settings-group" role="group" aria-label="Code font size">
                  <span className="workbench-settings-label">Code size</span>
                  <div className="workbench-fontsize">
                    <button
                      type="button"
                      className="workbench-fs-btn"
                      onClick={() => setFontSize(clampFont(fontSize - 1))}
                      aria-label="Decrease font size"
                    >
                      A-
                    </button>
                    <span className="workbench-fontsize-value">{fontSize}px</span>
                    <button
                      type="button"
                      className="workbench-fs-btn"
                      onClick={() => setFontSize(clampFont(fontSize + 1))}
                      aria-label="Increase font size"
                    >
                      A+
                    </button>
                  </div>
                </div>
                <div className="workbench-settings-group">
                  <label className="workbench-toggle" title="When off, no suggestion popups interrupt your typing">
                    <span
                      className={`workbench-toggle-track${autocomplete ? ' on' : ''}`}
                      onClick={(e) => {
                        e.preventDefault()
                        setAutocomplete((v) => !v)
                      }}
                    >
                      <span className="workbench-toggle-thumb" />
                    </span>
                    Autocomplete {autocomplete ? 'On' : 'Off'}
                  </label>
                </div>
                <div className="workbench-settings-group">
                  <label className="workbench-toggle" title="When on, the code can be read but not edited">
                    <span
                      className={`workbench-toggle-track${readOnly ? ' on' : ''}`}
                      onClick={(e) => {
                        e.preventDefault()
                        setReadOnly((v) => !v)
                      }}
                    >
                      <span className="workbench-toggle-thumb" />
                    </span>
                    Read only {readOnly ? 'On' : 'Off'}
                  </label>
                </div>
                <div className="workbench-settings-group">
                  <button type="button" className="btn btn-ghost btn-sm workbench-format-btn" onClick={formatActive}>
                    Format code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isWebPlayground ? (
        <div className="workbench-webplay">
          <WebPlayground fontSize={fontSize} onFontSizeChange={setFontSize} autocomplete={autocomplete} readOnly={readOnly} />
        </div>
      ) : (
        <>
          {/* Mobile Code/Output row: filename + Output buttons with Run and
              Reset beside them — everything needed fits in one short row. */}
          <div className="workbench-pane-tabs" role="tablist" aria-label="Editor panes">
            <button
              type="button"
              className={`workbench-pane-tab${mobilePane === 'code' ? ' active' : ''}`}
              role="tab"
              aria-selected={mobilePane === 'code'}
              onClick={() => setMobilePane('code')}
            >
              <span className="workbench-mono-label">{selectedLang?.filename}</span>
            </button>
            <button
              type="button"
              className={`workbench-pane-tab${mobilePane === 'output' ? ' active' : ''}`}
              role="tab"
              aria-selected={mobilePane === 'output'}
              onClick={() => setMobilePane('output')}
            >
              Output
            </button>
            <div className="workbench-pane-actions">
              <button type="button" className="workbench-icon-btn" aria-label="Reset code to sample" title="Reset code" onClick={reset}>
                <Icon name="rotate" size={14} />
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={running} onClick={run}>
                <Icon name="play" size={12} filled />
                {running ? 'Running…' : 'Run'}
              </button>
            </div>
          </div>

          <div className="workbench-body">
            <div className={`workbench-pane workbench-editor-pane${mobilePane !== 'code' ? ' is-pane-hidden' : ''}`}>
              <div className="workbench-pane-label">{selectedLang?.filename}</div>
              <div className="workbench-editor-host">
                <CodeEditor
                  value={editorValue}
                  onChange={onCodeChange}
                  language={selectedLang?.monaco}
                  readOnly={readOnly}
                  autocomplete={autocomplete}
                  fontSize={fontSize}
                  onFontSizeChange={setFontSize}
                  onReady={(api) => {
                    editorApiRef.current = api
                  }}
                />
              </div>
            </div>

            <div className={`workbench-pane workbench-output-pane${mobilePane !== 'output' ? ' is-pane-hidden' : ''}`}>
              <div className="workbench-pane-label workbench-output-tabs">
                <button type="button" className="workbench-output-tab active" aria-pressed="true">
                  Terminal
                </button>
              </div>
              <div className="workbench-terminal-host">
                {runnerRef.current && (
                  <Terminal key={runnerVersion} runner={runnerRef.current} started={started} />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
