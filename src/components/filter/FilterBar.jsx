import { optionLabel } from '../../lib/filters.js'
import CountUp from '../../motion/CountUp.jsx'
import { useFilters } from '../../state/FilterContext.jsx'
import { CloseIcon } from '../Icons.jsx'

// "Showing:" bar under the view header, one chip per pick (spec section 6).
// `shown` / `total` are the sessions this view lists with and without the filter.
export default function FilterBar({ shown, total }) {
  const { picks, toggle, clearAll } = useFilters()
  if (!picks.length) return null
  const fromLegend = picks.some((p) => p.from === 'legend')

  return (
    <div className="atlas-filter-bar atlas-view-enter" role="status" aria-live="polite">
      <span className="atlas-eyebrow atlas-filter-bar-label">SHOWING:</span>
      {picks.map((p) => (
        <span key={`${p.group}:${p.value}`} className="atlas-filter-chip atlas-row-in">
          {p.group === 'status' && <span className={`atlas-status-dot atlas-status-dot--${p.value}`} />}
          {optionLabel(p.group, p.value)}
          <button
            type="button"
            className="atlas-filter-chip-x"
            aria-label={`Remove ${optionLabel(p.group, p.value)}`}
            onClick={() => toggle(p.group, p.value, p.from)}
          >
            <CloseIcon size={9} />
          </button>
        </span>
      ))}
      {picks.length >= 2 && (
        <button type="button" className="atlas-link atlas-filter-clear" onClick={clearAll}>Clear all</button>
      )}
      <span className="atlas-filter-bar-count">
        <CountUp value={shown} /> of {total} sessions
        {fromLegend && ' · picked on the legend, every view shows only these sessions'}
      </span>
    </div>
  )
}
