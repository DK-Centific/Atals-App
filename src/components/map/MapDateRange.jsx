import { useCallback, useEffect, useRef, useState } from 'react'
import { RANGE_PRESETS, rangeFor, rangeLabel } from '../../lib/dateRange.js'
import usePresence from '../../motion/usePresence.js'
import { useMap } from '../../state/MapContext.jsx'

const PEEK_MS = 5000 // a hidden bar comes back this long after the map is touched
const BAR_EXIT_MS = 160 // matches .atlas-range-bar[data-state="closing"]
const QUIET_MS = 900 // after Hide, the pointer leaving the bar doesn't bring it straight back

// Preset pills plus From / To for a custom span. The filter menu shows it as
// pills ('menu'); the bar over the map shows it as chips ('bar').
export function DateRangePicker({ variant = 'menu' }) {
  const { range, setRange } = useMap()
  const pill = variant === 'menu' ? 'atlas-filter-pill' : 'atlas-range-chip'

  const pick = (preset) => setRange(preset === 'custom' ? { ...range, preset } : { preset, ...rangeFor(preset) })
  // Moving one end past the other drags the other end along.
  const setEnd = (end, value) => {
    if (!value) return
    const next = { ...range, preset: 'custom', [end]: value }
    if (next.from > next.to) next[end === 'from' ? 'to' : 'from'] = value
    setRange(next)
  }

  return (
    <div className={`atlas-range atlas-range--${variant}`}>
      <div className="atlas-range-presets atlas-no-scrollbar" role="group" aria-label="Booking dates">
        {RANGE_PRESETS.map((p) => {
          const on = range.preset === p.id
          return (
            <button key={p.id} type="button" className={`${pill}${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => pick(p.id)}>
              {p.label}
            </button>
          )
        })}
      </div>
      {range.preset === 'custom' && (
        <div className="atlas-range-custom atlas-row-in">
          <label className="atlas-range-field">
            <span className="atlas-eyebrow">FROM</span>
            <input type="date" className="atlas-range-input" value={range.from} onChange={(e) => setEnd('from', e.target.value)} />
          </label>
          <label className="atlas-range-field">
            <span className="atlas-eyebrow">TO</span>
            <input type="date" className="atlas-range-input" value={range.to} onChange={(e) => setEnd('to', e.target.value)} />
          </label>
        </div>
      )}
    </div>
  )
}

// Date bar centred over the top of the map. Put away, it peeks for 5 seconds
// whenever the map is hovered, scrolled, panned, zoomed or tapped, and stays
// while the pointer or focus is on it.
export function MapDateBar({ map, booked }) {
  const { range, rangeBarHidden, setRangeBarHidden } = useMap()
  const [peek, setPeek] = useState(false)
  const held = useRef(false)
  const timer = useRef(0)
  const quietUntil = useRef(0)
  const { mounted, state, onAnimationEnd } = usePresence(!rangeBarHidden || peek, BAR_EXIT_MS)

  const later = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { if (!held.current) setPeek(false) }, PEEK_MS)
  }, [])
  const wake = useCallback(() => {
    if (Date.now() < quietUntil.current) return
    setPeek(true)
    later()
  }, [later])

  useEffect(() => {
    if (!map || !rangeBarHidden) return undefined
    const el = map.getContainer()
    el.addEventListener('pointermove', wake)
    el.addEventListener('wheel', wake, { passive: true })
    map.on('movestart', wake)
    map.on('click', wake)
    return () => {
      el.removeEventListener('pointermove', wake)
      el.removeEventListener('wheel', wake)
      map.off('movestart', wake)
      map.off('click', wake)
      clearTimeout(timer.current)
    }
  }, [map, rangeBarHidden, wake])

  const hold = () => { held.current = true; clearTimeout(timer.current) }
  const release = () => { held.current = false; if (rangeBarHidden) later() }
  const hide = () => {
    held.current = false
    quietUntil.current = Date.now() + QUIET_MS
    setPeek(false)
    setRangeBarHidden(true)
  }
  const keep = () => { setPeek(false); setRangeBarHidden(false) }

  if (!mounted) return null
  return (
    <section
      className="atlas-range-bar atlas-map-chrome"
      data-state={state}
      aria-label="Booking dates on the map"
      onAnimationEnd={onAnimationEnd}
      onPointerEnter={hold}
      onPointerLeave={release}
      onFocus={hold}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) release() }}
    >
      <div className="atlas-range-bar-head">
        <svg className="atlas-range-bar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        <span key={`${range.from}-${range.to}`} className="atlas-range-bar-label atlas-status-line">
          {rangeLabel(range)} · {booked} {booked === 1 ? 'booking' : 'bookings'}
        </span>
      </div>
      <DateRangePicker variant="bar" />
      {rangeBarHidden ? (
        <button type="button" className="atlas-range-bar-btn atlas-icon-btn" aria-label="Keep the date bar shown" title="Keep shown" onClick={keep}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 17v5M9 10.76V6h6v4.76l2 3.24H7z" /></svg>
        </button>
      ) : (
        <button type="button" className="atlas-range-bar-btn atlas-icon-btn" aria-label="Hide the date bar" title="Hide. Hover or move the map to see it again" onClick={hide}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6" /></svg>
        </button>
      )}
    </section>
  )
}
