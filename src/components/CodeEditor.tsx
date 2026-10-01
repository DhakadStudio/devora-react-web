import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from '../lib/theme'
import { attachEditorZoom } from '../lib/editorZoom'

const Monaco = lazy(async () => {
  const mod = await import('@monaco-editor/react')
  const Editor = (mod as unknown as { default: { default?: unknown } }).default
  // Some bundler/interop layers double-wrap the CJS default export; unwrap defensively.
  const Component = ((Editor as { default?: unknown }).default ?? Editor) as typeof import('@monaco-editor/react').default
  return { default: Component }
})

type MonacoLike = {
  editor: {
    defineTheme: (name: string, theme: unknown) => void
    setTheme: (name: string) => void
  }
}

type ThemeRule = { token: string; foreground?: string; background?: string; fontStyle?: string }

const DARK_RULES: ThemeRule[] = [
  { token: '', foreground: 'EDEEF0', background: '101114' },
  { token: 'comment', foreground: '7A8087', fontStyle: 'italic' },
  { token: 'keyword', foreground: '2AD4F0' },
  { token: 'keyword.control', foreground: '2AD4F0' },
  { token: 'keyword.flow', foreground: '2AD4F0' },
  { token: 'string', foreground: '5BE49B' },
  { token: 'string.escape', foreground: 'A7F3D0' },
  { token: 'regexp', foreground: 'FBBF24' },
  { token: 'number', foreground: 'FBBF24' },
  { token: 'number.hex', foreground: 'FBBF24' },
  { token: 'type', foreground: '67E8F9' },
  { token: 'type.identifier', foreground: '67E8F9' },
  { token: 'function', foreground: '7DD3FC' },
  { token: 'entity.name.function', foreground: '7DD3FC' },
  { token: 'variable', foreground: 'EDEEF0' },
  { token: 'variable.predefined', foreground: '67E8F9' },
  { token: 'parameter', foreground: 'EDEEF0' },
  { token: 'operator', foreground: '9BA1A8' },
  { token: 'delimiter', foreground: '9BA1A8' },
  { token: 'delimiter.bracket', foreground: '9BA1A8' },
  { token: 'tag', foreground: '2AD4F0' },
  { token: 'attribute.name', foreground: 'FBBF24' },
  { token: 'attribute.value', foreground: '5BE49B' },
  { token: 'metatag', foreground: '7A8087' }
]

const LIGHT_RULES: ThemeRule[] = [
  { token: '', foreground: '1A1B1E', background: 'FFFFFF' },
  { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
  { token: 'keyword', foreground: '0E7490' },
  { token: 'keyword.control', foreground: '0E7490' },
  { token: 'keyword.flow', foreground: '0E7490' },
  { token: 'string', foreground: '166534' },
  { token: 'string.escape', foreground: '047857' },
  { token: 'regexp', foreground: '92400E' },
  { token: 'number', foreground: '92400E' },
  { token: 'number.hex', foreground: '92400E' },
  { token: 'type', foreground: '0E7490' },
  { token: 'type.identifier', foreground: '0E7490' },
  { token: 'function', foreground: '0369A1' },
  { token: 'entity.name.function', foreground: '0369A1' },
  { token: 'variable', foreground: '1A1B1E' },
  { token: 'variable.predefined', foreground: '0E7490' },
  { token: 'parameter', foreground: '1A1B1E' },
  { token: 'operator', foreground: '565B63' },
  { token: 'delimiter', foreground: '565B63' },
  { token: 'delimiter.bracket', foreground: '565B63' },
  { token: 'tag', foreground: '0E7490' },
  { token: 'attribute.name', foreground: '92400E' },
  { token: 'attribute.value', foreground: '166534' },
  { token: 'metatag', foreground: '6B7280' }
]

const DARK_THEME = {
  base: 'vs-dark' as const,
  inherit: false,
  rules: DARK_RULES,
  colors: {
    'editor.background': '#101114',
    'editor.foreground': '#EDEEF0',
    'editorLineNumber.foreground': '#565B63',
    'editorLineNumber.activeForeground': '#9BA1A8',
    'editorCursor.foreground': '#2AD4F0',
    'editor.selectionBackground': 'rgba(8,145,178,0.30)',
    'editor.selectionHighlightBackground': 'rgba(42,212,240,0.18)',
    'editor.inactiveSelectionBackground': 'rgba(8,145,178,0.15)',
    'editor.wordHighlightBackground': 'rgba(42,212,240,0.10)',
    'editor.wordHighlightStrongBackground': 'rgba(42,212,240,0.20)',
    'editor.lineHighlightBackground': '#191D23',
    'editor.lineHighlightBorder': '#00000000',
    'editorIndentGuide.background1': '#1F2126',
    'editorIndentGuide.activeBackground1': '#2E3238',
    'editorWidget.background': '#1B1D21',
    'editorWidget.border': '#26292E',
    'editorSuggestWidget.background': '#1B1D21',
    'editorSuggestWidget.selectedBackground': 'rgba(8,145,178,0.20)',
    'editorHoverWidget.background': '#1B1D21',
    'editorHoverWidget.border': '#26292E',
    'scrollbarSlider.background': 'rgba(155,161,168,0.25)',
    'scrollbarSlider.hoverBackground': 'rgba(155,161,168,0.40)',
    'scrollbarSlider.activeBackground': 'rgba(8,145,178,0.45)',
    'editorBracketMatch.background': 'rgba(42,212,240,0.12)',
    'editorBracketMatch.border': '#3A3F47',
    'editorBracketHighlight.foreground1': '#2AD4F0',
    'editorBracketHighlight.foreground2': '#FBBF24',
    'editorBracketHighlight.foreground3': '#5BE49B',
    'editorGutter.background': '#101114',
    'editorOverviewRuler.border': '#101114'
  }
}

const LIGHT_THEME = {
  base: 'vs' as const,
  inherit: false,
  rules: LIGHT_RULES,
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#1A1B1E',
    'editorLineNumber.foreground': '#9CA3AF',
    'editorLineNumber.activeForeground': '#565B63',
    'editorCursor.foreground': '#0891B2',
    'editor.selectionBackground': 'rgba(8,145,178,0.22)',
    'editor.selectionHighlightBackground': 'rgba(8,145,178,0.12)',
    'editor.inactiveSelectionBackground': 'rgba(8,145,178,0.10)',
    'editor.wordHighlightBackground': 'rgba(8,145,178,0.08)',
    'editor.wordHighlightStrongBackground': 'rgba(8,145,178,0.15)',
    'editor.lineHighlightBackground': '#F0F4F5',
    'editor.lineHighlightBorder': '#00000000',
    'editorIndentGuide.background1': '#E3E3DF',
    'editorIndentGuide.activeBackground1': '#C7C9CE',
    'editorWidget.background': '#FBFBFA',
    'editorWidget.border': '#E3E3DF',
    'editorSuggestWidget.background': '#FBFBFA',
    'editorSuggestWidget.selectedBackground': 'rgba(8,145,178,0.15)',
    'editorHoverWidget.background': '#FBFBFA',
    'editorHoverWidget.border': '#E3E3DF',
    'scrollbarSlider.background': 'rgba(26,27,30,0.20)',
    'scrollbarSlider.hoverBackground': 'rgba(26,27,30,0.35)',
    'scrollbarSlider.activeBackground': 'rgba(8,145,178,0.40)',
    'editorBracketMatch.background': 'rgba(8,145,178,0.10)',
    'editorBracketMatch.border': '#C7C9CE',
    'editorBracketHighlight.foreground1': '#0E7490',
    'editorBracketHighlight.foreground2': '#92400E',
    'editorBracketHighlight.foreground3': '#166534',
    'editorGutter.background': '#FFFFFF',
    'editorOverviewRuler.border': '#FFFFFF'
  }
}

const THEMES_REGISTERED = { dark: false, light: false }

function registerTheme(monaco: MonacoLike, mode: 'dark' | 'light'): string {
  if (mode === 'dark' && !THEMES_REGISTERED.dark) {
    monaco.editor.defineTheme('devora-dark', DARK_THEME)
    THEMES_REGISTERED.dark = true
  }
  if (mode === 'light' && !THEMES_REGISTERED.light) {
    monaco.editor.defineTheme('devora-light', LIGHT_THEME)
    THEMES_REGISTERED.light = true
  }
  return mode === 'dark' ? 'devora-dark' : 'devora-light'
}

interface MonacoEditorInstance {
  getAction: (id: string) => { run: () => Promise<void> } | null
  executeEdits: (source: string, edits: { range: unknown; text: string }[]) => boolean
  getModel: () => {
    getFullModelRange: () => unknown
    getValue: () => string
  } | null
  trigger: (source: string, id: string) => void
}

export interface EditorApi {
  /** Formats the whole open file (editor action 'editor.action.formatDocument'). */
  format: () => void
  /** Whole-file replacement that KEEPS the undo stack — Undo afterwards
   *  restores the code the learner had before the replacement. */
  replaceWholeText: (v: string) => void
}

interface Props {
  value: string
  onChange: (v: string) => void
  language?: string
  readOnly?: boolean
  /** Unique per editor instance — each instance gets its OWN Monaco model
   *  URI, so two editors never share/collide on the same model. */
  editorId?: string
  autocomplete?: boolean
  fontSize?: number
  onFontSizeChange?: (n: number) => void
  onReady?: (api: EditorApi) => void
}

export function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
  editorId = 'editor',
  autocomplete = false,
  fontSize: fontSizeProp,
  onFontSizeChange,
  onReady
}: Props) {
  const { theme } = useTheme()
  const monacoLanguage = language === 'javascript' ? 'javascript' : language
  const hostRef = useRef<HTMLDivElement>(null)
  const fontSizeRef = useRef(fontSizeProp ?? 14)
  const [fontSizeState, setFontSizeState] = useState(fontSizeProp ?? 14)
  const fontSize = fontSizeProp ?? fontSizeState
  const setFontSize = useCallback(
    (n: number) => {
      fontSizeRef.current = n
      if (onFontSizeChange) onFontSizeChange(n)
      else setFontSizeState(n)
    },
    [onFontSizeChange]
  )
  const editorRef = useRef<MonacoEditorInstance | null>(null)

  useEffect(() => {
    return attachEditorZoom(hostRef.current, () => fontSizeRef.current, setFontSize)
  }, [setFontSize])

  return (
    <div className="editor-host" role="group" aria-label="Code editor" ref={hostRef}>
      <Suspense
        fallback={
          <textarea
            className="codeview"
            style={{ border: 0, resize: 'none', width: '100%', outline: 'none' }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            aria-label="Code editor (plain text fallback while the editor loads)"
            spellCheck={false}
          />
        }
      >
        <Monaco
          height="100%"
          language={monacoLanguage}
          defaultLanguage={monacoLanguage}
          path={`devora-${editorId}/file.${language === 'javascript' ? 'js' : language}`}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          beforeMount={(monaco) => {
            registerTheme(monaco as unknown as MonacoLike, 'dark')
            registerTheme(monaco as unknown as MonacoLike, 'light')
          }}
          onMount={(editor) => {
            const instance = editor as unknown as MonacoEditorInstance
            editorRef.current = instance
            onReady?.({
              format: () => {
                instance.getAction('editor.action.formatDocument')?.run().catch(() => {})
              },
              replaceWholeText: (v: string) => {
                const model = instance.getModel()
                if (!model) return
                instance.executeEdits('devora-reset', [
                  { range: model.getFullModelRange(), text: v }
                ])
              }
            })
          }}
          theme={theme === 'dark' ? 'devora-dark' : 'devora-light'}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize,
            fontLigatures: true,
            lineHeight: 1.7,
            padding: { top: 14, bottom: 14 },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'line',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            quickSuggestions: autocomplete,
            suggestOnTriggerCharacters: autocomplete,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: 'active' },
            fixedOverflowWidgets: true,
            accessibilitySupport: 'on'
          }}
          loading={
            <div className="loading-wrap" style={{ position: 'relative', width: '100%', height: '100%' }}>
              <textarea
                className="codeview"
                style={{ border: 0, resize: 'none', width: '100%', height: '100%', outline: 'none' }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readOnly}
                aria-label="Code editor (plain text view while the editor loads)"
                spellCheck={false}
              />
              <div
                className="loading-wrap"
                style={{ position: 'absolute', top: 8, right: 12 }}
                aria-hidden="true"
              >
                <span className="spinner" />
              </div>
            </div>
          }
        />
      </Suspense>
    </div>
  )
}
