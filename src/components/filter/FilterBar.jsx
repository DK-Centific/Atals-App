import { optionLabel } from '../../lib/filters.js'
import CountUp from '../../motion/CountUp.jsx'
import { useFilterGroups, useFilters } from '../../state/FilterContext.jsx'
import { QUEUE_RADIUS_MI, useParticipants } from '../../state/ParticipantContext.jsx'
import { CloseIcon } from '../Icons.jsx'

// "Showing:" bar under the view header, one chip per pick (spec section 6).
// `shown` / `total` are what this view lists with and without the filter,
// counted as `noun` (the map counts people, the schedule counts sessions).
export default function FilterBar({ shown, total, noun = 'sessions' }) {
  const { picks, toggle, clearAll } = useFilters()
  const groups = useFilterGroups()
  const { rangeMi, setRangeMi } = useParticipants()
  // The range from HQ shows as a chip only when it isn't the usual 40 mi.
  const wider = rangeMi !== QUEUE_RADIUS_MI
  const rangeChip = rangeMi == null ? 'Any distance' : `Within ${rangeMi} mi`
  const chips = picks.length + (wider ? 1 : 0)
  if (!chips) return null
  const clearEverything = () => { clearAll(); setRangeMi(QUEUE_RADIUS_MI) }
  const fromLegend = picks.some((p) => p.from === 'legend')

  return (
    <div className="atlas-filter-bar atlas-view-enter" role="status" aria-live="polite">
      <span className="atlas-eyebrow atlas-filter-bar-label">SHOWING:</span>
      {picks.map((p) => (
        <span key={`${p.group}:${p.value}`} className="atlas-filter-chip atlas-row-in">
          {p.group === 'status' && <span className={`atlas-status-dot atlas-status-dot--${p.value}`} />}
          {optionLabel(groups, p.group, p.value)}
          <button
            type="button"
            className="atlas-filter-chip-x"
            aria-label={`Remove ${optionLabel(groups, p.group, p.value)}`}
            onClick={() => toggle(p.group, p.value, p.from)}
          >
            <CloseIcon size={9} />
          </button>
        </span>
      ))}
      {wider && (
        <span className="atlas-filter-chip atlas-row-in" title="Who’s open to book on the Map and in New Booking">
          {rangeChip}
          <button
            type="button"
            className="atlas-filter-chip-x"
            aria-label={`Back to within ${QUEUE_RADIUS_MI} mi`}
            onClick={() => setRangeMi(QUEUE_RADIUS_MI)}
          >
            <CloseIcon size={9} />
          </button>
        </span>
      )}
      {chips >= 2 && (
        <button type="button" className="atlas-link atlas-filter-clear" onClick={clearEverything}>Clear all</button>
      )}
      <span className="atlas-filter-bar-count">
        <CountUp value={shown} /> of {total} {noun}
        {fromLegend && ` · picked on the legend, every view shows only these ${noun}`}
      </span>
    </div>
  )
}
