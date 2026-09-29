/**
 * Monaco cannot mount in jsdom (no ResizeObserver / layout engine), so the
 * editor boundary is stubbed to a plain textarea. MockMonaco is a drop-in for
 * the @monaco-editor/react default export — the REAL CodeEditor component
 * still renders, themes and wires it, so typing goes through the page's real
 * onChange path. MockCodeEditor is the equivalent drop-in for the CodeEditor
 * component module itself, for tests that mock that module directly.
 */
export function MockMonaco({
  value,
  onChange
}: {
  value: string
  onChange?: (v: string | undefined) => void
}) {
  return (
    <textarea
      data-testid="mock-editor"
      className="codeview"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label="Code editor (plain text fallback while the editor loads)"
      spellCheck={false}
    />
  )
}

export function MockCodeEditor({
  value,
  onChange,
  readOnly = false
}: {
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
}) {
  return (
    <textarea
      data-testid="mock-editor"
      className="codeview"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      aria-label="Code editor (plain text fallback while the editor loads)"
      spellCheck={false}
    />
  )
}
