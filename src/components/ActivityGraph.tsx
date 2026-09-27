/**
 * ActivityGraph — a GitHub-style consistency grid: weeks as columns,
 * days as rows, darker accent = more activity that day. Pure SVG-less
 * CSS grid; each cell is labelled for screen readers.
 */
interface Props {
  /** dateISO (YYYY-MM-DD) → count of coding actions that day */
  activity: Record<string, number>
  /** how many weeks to show, newest on the right */
  weeks?: number
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function ActivityGraph({ activity, weeks = 24 }: Props) {
  // Build columns oldest → newest, each 7 days ending on today.
  const today = new Date()
  const end = new Date(today)
  // align the last column's bottom row to today
  const columns: { date: string; count: number; future: boolean }[][] = []
  const start = new Date(today)
  start.setDate(start.getDate() - ((weeks - 1) * 7 + start.getDay()))

  const max = Math.max(1, ...Object.values(activity))
  for (let w = 0; w < weeks; w++) {
    const col: { date: string; count: number; future: boolean }[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + w * 7 + d)
      const iso = isoDay(day)
      col.push({ date: iso, count: activity[iso] ?? 0, future: day > end })
    }
    columns.push(col)
  }

  const level = (c: number) => (c === 0 ? 0 : c === 1 ? 1 : c <= max * 0.5 ? 2 : c < max ? 3 : 4)
  const total = Object.values(activity).reduce((a, b) => a + b, 0)

  const fmt = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div className="heat-wrap">
      <p className="muted fs-12" style={{ marginTop: 0 }}>
        {total} coding action{total === 1 ? '' : 's'} recorded so far
      </p>
      <div className="heat" role="grid" aria-label={`Coding activity over the last ${weeks} weeks`}>
        {columns.map((col, i) => (
          <div key={i} className="heat-col" role="row">
            {col.map((cell) => (
              <span
                key={cell.date}
                className="heat-cell"
                data-level={cell.future ? 0 : level(cell.count)}
                data-future={cell.future || undefined}
                title={cell.future ? undefined : `${fmt(cell.date)} — ${cell.count} action${cell.count === 1 ? '' : 's'}`}
                aria-label={cell.future ? undefined : `${fmt(cell.date)}: ${cell.count} coding actions`}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="heat-legend muted fs-12">
        Less
        <span className="heat-cell" data-level={0} aria-hidden="true" />
        <span className="heat-cell" data-level={1} aria-hidden="true" />
        <span className="heat-cell" data-level={2} aria-hidden="true" />
        <span className="heat-cell" data-level={3} aria-hidden="true" />
        <span className="heat-cell" data-level={4} aria-hidden="true" />
        More
      </p>
    </div>
  )
}
