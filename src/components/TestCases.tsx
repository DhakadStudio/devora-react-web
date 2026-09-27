import type { TestCaseResult } from '../lib/runner'
import { Icon } from './Icon'

export function TestCases({ tests, label = 'Test cases' }: { tests: TestCaseResult[]; label?: string }) {
  if (tests.length === 0) return null
  return (
    <div role="list" aria-label={label}>
      {tests.map((t) => (
        <div
          key={t.name}
          role="listitem"
          className="journey-row"
          style={{ gridTemplateColumns: '24px 1fr auto' }}
        >
          <span style={{ color: t.passed ? 'var(--success)' : 'var(--danger)' }}>
            <Icon name={t.passed ? 'check' : 'x'} size={14} filled={false} />
          </span>
          <span>
            <span style={{ display: 'block', fontSize: 'var(--fs-14)' }}>{t.name}</span>
            {!t.passed && t.detail && (
              <span className="muted fs-12" style={{ display: 'block' }}>
                {t.detail}
              </span>
            )}
          </span>
          <span className={`badge ${t.passed ? 'badge-success' : ''}`}>
            {t.passed ? 'pass' : 'fail'}
          </span>
        </div>
      ))}
    </div>
  )
}
