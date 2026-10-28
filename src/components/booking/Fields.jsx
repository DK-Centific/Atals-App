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
// time; they stay pickable, and booking them shows the clash. `optional` puts
// "Unassigned" first, for a booking an Admin will staff later.
export function ModeratorPicker({ value, onChange, busy = new Set(), optional = false }) {
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
        return (
          <button
            key={m.email || 'unassigned'}
            type="button"
            role="radio"
            className={`atlas-moderator-option${active ? ' is-active' : ''}${isBusy ? ' is-busy' : ''}${m.unassigned ? ' is-unassigned' : ''}`}
            aria-checked={active}
            aria-label={m.unassigned ? 'Unassigned, an Admin assigns one later' : `${m.displayName}${isBusy ? ', busy at this time' : ''}`}
            title={m.unassigned ? 'An Admin assigns the moderator once the booking is ready' : m.displayName}
            onClick={() => onChange(m.email)}
          >
            <span className="atlas-moderator-badge" aria-hidden="true">{m.unassigned ? '–' : initials(m.displayName)}</span>
            <span className="atlas-moderator-text">
              <span className="atlas-moderator-name">{m.unassigned ? 'Unassigned' : firstName(m)}</span>
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

function EmailCheck({ label, hint, checked, disabled, onChange }) {
  return (
    <label className={`atlas-check${disabled ? ' is-disabled' : ''}`}>
      <input
        type="checkbox"
        className="atlas-check-box"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="atlas-check-text">
        <span className="atlas-check-label">{label}</span>
        {hint && <span className="atlas-check-hint">{hint}</span>}
      </span>
    </label>
  )
}

// Who gets emailed on book, reschedule and cancel: two separate choices, both on
// by default. `value` is { participant, moderator }. `moderator` says what the
// moderator box can do: 'on' (pickable), 'unassigned' (shown, off: an Admin
// assigns later) or 'hidden' (this role doesn't email moderators here).
export function EmailFields({ value, onChange, email, moderator = 'on', participantHidden = false }) {
  const noEmail = !email?.trim()
  return (
    <div className="atlas-email-fields" role="group" aria-label="Emails">
      {!participantHidden && <EmailCheck
        label="Email participant"
        hint={noEmail ? 'No participant email on file.' : null}
        checked={value.participant}
        disabled={noEmail}
        onChange={(participant) => onChange({ ...value, participant })}
      />}
      {moderator !== 'hidden' && (
        <EmailCheck
          label="Email moderator"
          hint={moderator === 'unassigned' ? 'Admin assigns the moderator. They’re emailed then.' : 'Includes the checklist link.'}
          checked={value.moderator}
          disabled={moderator === 'unassigned'}
          onChange={(m) => onChange({ ...value, moderator: m })}
        />
      )}
      {DRY_RUN && <p className="atlas-check-hint atlas-email-dry">Dry run: nothing is emailed until the action flow is set.</p>}
    </div>
  )
}

/** The `notify` option for ScheduleContext from the boxes and what the form allows. */
export const notifyFrom = (value, { moderator = 'on' } = {}) => ({
  participant: value.participant,
  moderator: moderator === 'on' && value.moderator,
})

/** " · email to … queued" for the Saved note; a participant with no email isn't counted. */
export const emailSummary = (n, email) => {
  const who = [n.participant && email?.trim() && 'participant', n.moderator && 'moderator'].filter(Boolean)
  return who.length ? ` · email to ${who.join(' and ')} queued` : ''
}
