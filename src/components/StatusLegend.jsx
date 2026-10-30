import { useMemo } from 'react'
import { STATUS } from '../data/schedule.js'
import { UNASSIGNED } from '../data/moderators.js'
import { needsModerator } from '../lib/bookings.js'
import { matches } from '../lib/filters.js'
import CountUp from '../motion/CountUp.jsx'
import { isPicked, useFilters, useHomeOf } from '../state/FilterContext.jsx'

export const StatusDot = ({ status, pulse = false }) => (
  <div className={`atlas-status-dot atlas-status-dot--${status}${pulse ? ' atlas-pulse' : ''}`} />
)

// The legend doubles as an in-page status filter and a mini KPI: each status
// shows how many of this view's sessions it has. Counts follow every other filter
// (moderator, …) but not the status picks themselves, so picking "Booked" never turns
// the other counts to 0. `sessions` is the view's whole list before filtering.
export default function StatusLegend({ statuses = Object.keys(STATUS), wide = false, sessions = [] }) {
  const { picks, toggle } = useFilters()
  const homeOf = useHomeOf()
  const others = useMemo(() => picks.filter((p) => p.group !== 'status'), [picks])
  const counts = useMemo(() => {
    const c = Object.fromEntries(statuses.map((k) => [k, 0]))
    for (const item of sessions) if (item.status in c && matches(others, { ...item, home: homeOf(item) })) c[item.status] += 1
    return c
  }, [sessions, others, statuses, homeOf])
  const total = statuses.reduce((n, k) => n + counts[k], 0)
  // Live bookings an Admin still has to staff. Follows every pick but the moderator ones.
  const unassigned = useMemo(() => {
    const rest = picks.filter((p) => p.group !== 'moderator')
    return sessions.filter((s) => needsModerator(s) && matches(rest, { ...s, home: homeOf(s) })).length
  }, [sessions, picks, homeOf])
  const unassignedOn = isPicked(picks, 'moderator', UNASSIGNED)

  return (
    <div className={`atlas-legend${wide ? ' atlas-legend--wide' : ''}`} role="group" aria-label="Filter by status" data-tour="legend">
      <span className="atlas-legend-total" aria-label={`${total} sessions`}>
        <CountUp value={total} className="atlas-legend-count" /> <span className="atlas-legend-total-label">{total === 1 ? 'session' : 'sessions'}</span>
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
            <StatusDot status={s} />
            <CountUp value={counts[s]} className="atlas-legend-count" />
            {STATUS[s].label.toLowerCase()}
          </button>
        )
      })}
      {(unassigned > 0 || unassignedOn) && (
        <button
          type="button"
          className={`atlas-legend-item atlas-legend-item--unassigned atlas-hit${unassignedOn ? ' is-focus-on' : ''}`}
          data-tour="needs-moderator"
          aria-pressed={unassignedOn}
          aria-label={`Needs moderator: ${unassigned}`}
          title={unassignedOn ? 'Click again to clear' : 'Bookings an Admin still has to assign a moderator to'}
          onClick={() => toggle('moderator', UNASSIGNED, 'legend')}
        >
          <span className="atlas-legend-unassigned-mark" aria-hidden="true" />
          <CountUp value={unassigned} className="atlas-legend-count" />
          {unassigned === 1 ? 'needs a moderator' : 'need a moderator'}
        </button>
      )}
    </div>
  )
}
