import { lazy, Suspense } from 'react'
import { useTheme } from '../lib/theme'

const Monaco = lazy(async () => {
  const mod = await import('@monaco-editor/react')
  const Editor = (mod as unknown as { default: { default?: unknown } }).default
  // Some bundler/interop layers double-wrap the CJS default export; unwrap defensively.
  const Component = ((Editor as { default?: unknown }).default ?? Editor) as typeof import('@monaco-editor/react').default
  return { default: Component }
})

interface Props {
  value: string
  onChange: (v: string) => void
  language?: 'javascript' | 'html' | 'css' | 'python'
  readOnly?: boolean
}

export function CodeEditor({ value, onChange, language = 'javascript', readOnly = false }: Props) {
  const { theme } = useTheme()
  return (
    <div className="editor-host" role="group" aria-label="Code editor">
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
          defaultLanguage={language}
          path={`file.${language === 'javascript' ? 'js' : language}`}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 14,
            lineHeight: 1.7,
            padding: { top: 12, bottom: 12 },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            fixedOverflowWidgets: true,
            accessibilitySupport: 'on'
          }}
          loading={
            <div className="loading-wrap">
              <span className="spinner" aria-label="Editor loading" />
            </div>
          }
        />
      </Suspense>
    </div>
  )
}
