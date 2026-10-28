import { firstName } from '../../data/moderators.js'
import { useModerators } from '../../state/ModeratorContext.jsx'
import { DRY_RUN } from '../../lib/oneforma/config.ts'
import { CheckIcon, ClockIcon } from '../Icons.jsx'

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
// time; they stay pickable, and booking them shows the clash.
export function ModeratorPicker({ value, onChange, busy = new Set() }) {
  const { moderators } = useModerators()
  if (!moderators.length) return <p className="atlas-empty">No active moderators. Add one in Admin › Users.</p>
  return (
    <div className="atlas-moderator-list" role="radiogroup" aria-label="Moderator">
      {moderators.map((m) => {
        const active = m.email === value
        const isBusy = busy.has(m.email)
        return (
          <button
            key={m.email}
            type="button"
            role="radio"
            className={`atlas-moderator-option${active ? ' is-active' : ''}${isBusy ? ' is-busy' : ''}`}
            aria-checked={active}
            aria-label={`${m.displayName}${isBusy ? ', busy at this time' : ''}`}
            title={m.displayName}
            onClick={() => onChange(m.email)}
          >
            <span className="atlas-moderator-badge" aria-hidden="true">{initials(m.displayName)}</span>
            <span className="atlas-moderator-text">
              <span className="atlas-moderator-name">{firstName(m)}</span>
              {isBusy && <span className="atlas-moderator-busy">Busy</span>}
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

// "Email the participant and moderator" on book, reschedule and cancel. On by default.
export function NotifyField({ checked, onChange, email }) {
  const hint = !email?.trim()
    ? 'No participant email on file, so only the moderator gets it.'
    : DRY_RUN
      ? 'Dry run: nothing is emailed until the action flow is set.'
      : 'Sent by the Atlas action flow. The moderator also gets the checklist link.'
  return (
    <label className="atlas-check">
      <input type="checkbox" className="atlas-check-box" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="atlas-check-text">
        <span className="atlas-check-label">Email the participant and moderator</span>
        <span className="atlas-check-hint">{hint}</span>
      </span>
    </label>
  )
}
