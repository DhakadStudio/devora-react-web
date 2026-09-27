import { Icon } from './Icon'

export type JourneyState = 'done' | 'current' | 'todo'

export function JourneyNode({ state }: { state: JourneyState }) {
  return (
    <span className="journey-node" aria-hidden="true">
      {state === 'done' ? <Icon name="check" size={14} /> : null}
      {state === 'current' ? <Icon name="chevronR" size={14} /> : null}
      {state === 'todo' ? <Icon name="lock" size={12} /> : null}
    </span>
  )
}

export function ProgressBar({ ratio, label }: { ratio: number; label: string }) {
  const pct = Math.round(ratio * 100)
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
        <span className="label">{label}</span>
        <span className="mono fs-12 muted">{pct}%</span>
      </div>
      <div
        className="pbar"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function CodeBlock({ code }: { code: string }) {
  const lines = code.replace(/\n$/, '').split('\n')
  return (
    <pre className="codeview" tabIndex={0} aria-label="Code example">
      {lines.map((line, i) => (
        <div key={i}>
          <span className="ln">{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: highlight(line) }} />
        </div>
      ))}
    </pre>
  )
}

/* Tiny, safe highlighter: comments, strings, keywords — 3 colors total (per token sheet). */
function highlight(line: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const kw = /\b(let|const|function|return|if|else|for|while|new|typeof|true|false|await|async|import|from|export)\b/g
  const cmtIdx = line.indexOf('//')
  const code = cmtIdx >= 0 ? line.slice(0, cmtIdx) : line
  const comment = cmtIdx >= 0 ? line.slice(cmtIdx) : ''
  const out = esc(code)
    .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="str">$1</span>')
    .replace(kw, '<span class="kw">$1</span>')
  return out + (comment ? `<span class="cmt">${esc(comment)}</span>` : '')
}
