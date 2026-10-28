import { useMemo } from 'react'
import { STATUS } from '../data/schedule.js'
import { matches } from '../lib/filters.js'
import CountUp from '../motion/CountUp.jsx'
import { isPicked, useFilters } from '../state/FilterContext.jsx'

export const StatusDot = ({ status, pulse = false }) => (
  <div className={`atlas-status-dot atlas-status-dot--${status}${pulse ? ' atlas-pulse' : ''}`} />
)

// The legend doubles as an in-page status filter and a mini KPI: each status
// shows how many of this view's sessions it has. Counts follow every other filter
// (moderator, …) but not the status picks themselves, so picking "Booked" never turns
// the other counts to 0. `sessions` is the view's whole list before filtering.
export default function StatusLegend({ statuses = Object.keys(STATUS), wide = false, sessions = [] }) {
  const { picks, toggle } = useFilters()
  const others = useMemo(() => picks.filter((p) => p.group !== 'status'), [picks])
  const counts = useMemo(() => {
    const c = Object.fromEntries(statuses.map((k) => [k, 0]))
    for (const item of sessions) if (item.status in c && matches(others, item)) c[item.status] += 1
    return c
  }, [sessions, others, statuses])
  const total = statuses.reduce((n, k) => n + counts[k], 0)

  return (
    <div className={`atlas-legend${wide ? ' atlas-legend--wide' : ''}`} role="group" aria-label="Filter by status">
      <span className="atlas-legend-total" aria-label={`${total} sessions`}>
        <CountUp value={total} className="atlas-legend-count" /> <span className="atlas-legend-total-label">total</span>
      </span>
      {statuses.map((s) => {
        const on = isPicked(picks, 'status', s)
        return (
          <button
            key={s}
            type="button"
            className={`atlas-legend-item atlas-hit${on ? ' is-focus-on' : ''}`}
            data-status={s}
            aria-pressed={on}
            aria-label={`${STATUS[s].label}: ${counts[s]}`}
            title={on ? 'Click again to clear' : 'Filters this page'}
            onClick={() => toggle('status', s, 'legend')}
          >
            <StatusDot status={s} /> {STATUS[s].label}
            <CountUp value={counts[s]} className="atlas-legend-count" />
          </button>
        )
      })}
    </div>
  )
}
