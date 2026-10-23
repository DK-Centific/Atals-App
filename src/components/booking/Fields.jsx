import { TEAMS } from '../../data/schedule.js'
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

export function TeamPicker({ value, onChange }) {
  return (
    <div className="atlas-team-list" role="radiogroup" aria-label="Team">
      {TEAMS.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            className={`atlas-team-option${active ? ' is-active' : ''}`}
            aria-checked={active}
            onClick={() => onChange(t.id)}
          >
            <span className="atlas-team-badge">{t.code}</span>
            <span className="atlas-team-name">{t.name}</span>
            <span className="atlas-team-check"><CheckIcon /></span>
          </button>
        )
      })}
    </div>
  )
}
