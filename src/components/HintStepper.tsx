import { Icon } from './Icon'

interface Props {
  hints: string[]
  explanation: string
  revealed: number
  onReveal: () => void
  defaultCollapsed?: boolean
}

/** Progressive hint stepper: Hint 1 → 2 → 3 → Explanation. One step away, never the whole answer. */
export function HintStepper({ hints, explanation, revealed, onReveal, defaultCollapsed = false }: Props) {
  const lastIsExplanation = revealed === hints.length // next reveal after all hints = explanation
  const total = hints.length + 1 // hints + the full explanation
  const hasMore = revealed < total

  return (
    <section className="hint-box" aria-label="Hints">
      <p className="hint-locked" style={{ marginTop: 0 }}>
        <Icon name="lock" size={13} />
        {revealed === 0
          ? `${hints.length} hint${hints.length === 1 ? '' : 's'} available · the full explanation unlocks last`
          : revealed < total
            ? `${revealed} of ${total} steps shown · ${total - revealed} still locked`
            : 'All hints and the explanation are unlocked'}
      </p>

      {hints.slice(0, revealed).map((h, i) => (
        <div key={i} className="hint-item" role="note">
          <Icon name="spark" size={13} />
          <span>
            <strong className="mono" style={{ fontSize: 'var(--fs-12)' }}>
              Hint {i + 1}
            </strong>
            <br />
            {h}
          </span>
        </div>
      ))}
      {revealed === total && total > 0 && (
        <div className="hint-item" role="note">
          <Icon name="book" size={13} />
          <span>
            <strong className="mono" style={{ fontSize: 'var(--fs-12)' }}>
              Explanation
            </strong>
            <br />
            {explanation}
          </span>
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ minHeight: 44, marginTop: 'var(--sp-2)' }}
          onClick={onReveal}
        >
          {revealed === 0 && defaultCollapsed
            ? 'Show a hint (optional — try it yourself first)'
            : lastIsExplanation
              ? 'Reveal the full explanation'
              : `Reveal hint ${revealed + 1} of ${hints.length}`}
        </button>
      )}
    </section>
  )
}
