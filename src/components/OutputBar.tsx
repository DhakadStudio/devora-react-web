import type { RunResult } from '../lib/runner'
import { Icon } from './Icon'

export function OutputBar({ result, running }: { result: RunResult | null; running: boolean }) {
  const allPassed = result && result.tests.length > 0 && result.tests.every((t) => t.passed)
  return (
    <div className="output-bar" role="status" aria-live="polite">
      {running && (
        <span className="output-quiet">
          <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Running…
        </span>
      )}
      {!running && !result && <span className="output-quiet">Run your code to see output here.</span>}
      {!running && result && result.error && (
        <span className="output-err">
          <Icon name="alert" size={13} /> Stopped: {firstLine(result.error.message)}
        </span>
      )}
      {!running && result && !result.error && allPassed && (
        <span className="output-ok">
          <Icon name="check" size={13} /> All tests passed
        </span>
      )}
      {!running && result && !result.error && result.tests.length > 0 && !allPassed && (
        <span className="output-err">
          <Icon name="x" size={13} /> {result.tests.filter((t) => !t.passed).length} of {result.tests.length} checks failing
        </span>
      )}
      {!running && result && !result.error && result.tests.length === 0 && (
        <span className="output-ok">
          <Icon name="check" size={13} /> Ran without errors
        </span>
      )}
      {!running && result && (
        <span className="output-quiet">· exit {result.exitCode}</span>
      )}
    </div>
  )
}

export function ConsoleLogs({ result }: { result: RunResult }) {
  if (result.logs.length === 0) return null
  return (
    <pre className="output-logs" aria-label="Console output">
      {result.logs.map((l, i) => (
        <div key={i} className={l.type === 'error' ? 'err' : l.type === 'warn' ? 'warn' : ''}>
          {l.text}
        </div>
      ))}
    </pre>
  )
}

export function ErrorExplain({ result }: { result: RunResult }) {
  if (!result.error) return null
  return (
    <div className="error-explain" role="alert">
      <h4>
        <Icon name="alert" size={14} /> What happened
      </h4>
      <p>
        JavaScript stopped at <code>{firstLine(result.error.message)}</code>.
      </p>
      <h4 style={{ color: 'var(--muted)', marginTop: 'var(--sp-3)' }}>What it expected</h4>
      <p>{result.error.hint}</p>
      <h4 style={{ color: 'var(--muted)', marginTop: 'var(--sp-3)' }}>Next step</h4>
      <p>Fix that line, then press Run again. Still stuck? The next hint is one step away below.</p>
    </div>
  )
}

function firstLine(s: string) {
  return s.split('\n')[0]
}
