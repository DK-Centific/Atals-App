import { STATUS } from '../data/schedule.js'
import { isPicked, useFilters } from '../state/FilterContext.jsx'

export const StatusDot = ({ status, pulse = false }) => (
  <div className={`atlas-status-dot atlas-status-dot--${status}${pulse ? ' atlas-pulse' : ''}`} />
)

// The legend doubles as an in-page status filter: pressing a status narrows
// every view to it, and the legend keeps its full list with the pick highlighted.
export default function StatusLegend({ statuses = Object.keys(STATUS), wide = false }) {
  const { picks, toggle } = useFilters()
  return (
    <div className={`atlas-legend${wide ? ' atlas-legend--wide' : ''}`} role="group" aria-label="Filter by status">
      {statuses.map((s) => {
        const on = isPicked(picks, 'status', s)
        return (
          <button
            key={s}
            type="button"
            className={`atlas-legend-item atlas-hit${on ? ' is-focus-on' : ''}`}
            data-status={s}
            aria-pressed={on}
            title={on ? 'Click again to clear' : 'Filters this page'}
            onClick={() => toggle('status', s, 'legend')}
          >
            <StatusDot status={s} /> {STATUS[s].label}
          </button>
        )
      })}
    </div>
  )
}
