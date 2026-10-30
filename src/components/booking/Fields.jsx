import { firstName } from '../../data/moderators.js'
import { useModerators } from '../../state/ModeratorContext.jsx'
import { CheckIcon, ClockIcon } from '../Icons.jsx'
import { MAX_SESSIONS_PER_MODERATOR_PER_DAY } from '../../lib/bookings.js'

// Form fields shared by the New Booking panel and the booking details panel.

export function TimeField({ label, value, onChange }) {
  return (
    <div className="atlas-time-field">
      <label className="atlas-eyebrow">{label}</label>
      <div className="atlas-time-input-wrap">
        <input type="time" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="atlas-input" />
        <ClockIcon />
      </div>
    </div>
  )
}

export function TextField({ label, value, onChange, type = 'text', placeholder, multiline = false, autoFocus }) {
  return (
    <label className="atlas-field">
      <span className="atlas-eyebrow">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value ?? ''}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          className="atlas-input atlas-textarea"
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          className="atlas-input"
        />
      )}
    </label>
  )
}

// One moderator per session. `busy` holds who already has a booking at this
// time; they stay pickable, and booking them shows the clash. `optional` puts
// "Unassigned" first, for a booking an Admin will staff later. `counts` (email ->
// sessions that day) shows "3 of 5"; anyone at the daily limit can't be picked.
export function ModeratorPicker({ value, onChange, busy = new Set(), optional = false, counts = null }) {
  const { moderators } = useModerators()
  if (!moderators.length && !optional) return <p className="atlas-empty">No active moderators. Add one in Admin › Users.</p>
  const options = [
    ...(optional ? [{ email: '', displayName: 'Unassigned', unassigned: true }] : []),
    ...moderators,
  ]
  return (
    <div className="atlas-moderator-list" role="radiogroup" aria-label="Moderator">
      {options.map((m) => {
        const active = m.email === (value ?? '')
        const isBusy = busy.has(m.email)
        const n = counts && !m.unassigned ? counts.get(m.email) ?? 0 : null
        const full = n != null && n >= MAX_SESSIONS_PER_MODERATOR_PER_DAY && !active
        return (
          <button
            key={m.email || 'unassigned'}
            type="button"
            role="radio"
            className={`atlas-moderator-option${active ? ' is-active' : ''}${isBusy ? ' is-busy' : ''}${full ? ' is-full' : ''}${m.unassigned ? ' is-unassigned' : ''}`}
            aria-checked={active}
            disabled={full}
            aria-label={m.unassigned ? 'Unassigned, an Admin assigns one later' : `${m.displayName}${n != null ? `, ${n} of ${MAX_SESSIONS_PER_MODERATOR_PER_DAY} sessions that day` : ''}${full ? ', full' : ''}${isBusy ? ', busy at this time' : ''}`}
            title={m.unassigned ? 'An Admin assigns the moderator once the booking is ready' : full ? `${m.displayName} already has ${MAX_SESSIONS_PER_MODERATOR_PER_DAY} sessions that day, the daily limit` : m.displayName}
            onClick={() => onChange(m.email)}
          >
            <span className="atlas-moderator-badge" aria-hidden="true">{m.unassigned ? '–' : initials(m.displayName)}</span>
            <span className="atlas-moderator-text">
              <span className="atlas-moderator-name">{m.unassigned ? 'Unassigned' : firstName(m)}</span>
              {full ? <span className="atlas-moderator-busy">Full day</span> : isBusy && <span className="atlas-moderator-busy">Busy</span>}
              {n != null && !full && <span className="atlas-moderator-count">{n} of {MAX_SESSIONS_PER_MODERATOR_PER_DAY}</span>}
            </span>
            <span className="atlas-moderator-check"><CheckIcon /></span>
          </button>
        )
      })}
    </div>
  )
}

const initials = (name) => {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
}
