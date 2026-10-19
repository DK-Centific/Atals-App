import { TEAMS } from '../../data/schedule.js'
import { pressProps } from '../../motion/motion.js'
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
          <div
            key={t.id}
            className={`atlas-team-option${active ? ' is-active' : ''}`}
            aria-pressed={active}
            {...pressProps(() => onChange(t.id), t.name)}
          >
            <div className="atlas-team-badge">{t.code}</div>
            <span className="atlas-team-name">{t.name}</span>
            <div className="atlas-team-check"><CheckIcon /></div>
          </div>
        )
      })}
    </div>
  )
}
