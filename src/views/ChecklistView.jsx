import { useEffect, useMemo, useState } from 'react'
import { LogoIcon, PinIcon, CheckIcon } from '../components/Icons.jsx'
import AccountMenu from '../components/AccountMenu.jsx'
import { StatusDot } from '../components/StatusLegend.jsx'
import { STATUS, TODAY, toMinutes } from '../data/schedule.js'
import { UNASSIGNED, firstName as shownName } from '../data/moderators.js'
import { billableHours, formatHours } from '../lib/billing.js'
import { useModerators } from '../state/ModeratorContext.jsx'
import { addDays, longDayLabel } from '../lib/dates.js'
import useSlidingPill from '../motion/useSlidingPill.js'
import useViewNavigate from '../motion/useViewNavigate.js'
import { useToast } from '../motion/Toast.jsx'
import { useParticipant } from '../state/ParticipantContext.jsx'
import { useRole } from '../state/RoleContext.jsx'
import { useSchedule } from '../state/ScheduleContext.jsx'
import { useSync } from '../state/SyncContext.tsx'

// The Checklist app (Moderator landing screen), phone first. A moderator sees
// only the sessions assigned to them for today and tomorrow and works each one top to bottom:
// arrive, call the participant, confirm. Calling opens only on the session day.
// Admins and schedulers see every moderator's and can pick one. More steps come with the client SOP.

const DAYS = [
  { id: 'today', label: 'Today', offset: 0 },
  { id: 'tomorrow', label: 'Tomorrow', offset: 1 },
]

const clock = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
const stampTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const firstName = (name) => name.split(/\s+/)[0] ?? name

function Segmented({ value, onChange, options, label }) {
  const { trackRef, pillProps } = useSlidingPill(value)
  return (
    <div ref={trackRef} className="atlas-view-switch atlas-view-switch--recessed atlas-checklist-segment" role="group" aria-label={label}>
      <div {...pillProps} className={`${pillProps.className} atlas-view-pill`} />
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            className={`atlas-view-tab${on ? ' is-active' : ''}`}
            data-pill-active={on}
            aria-pressed={on}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Step({ n, title, doneAt, children }) {
  return (
    <li className={`atlas-checklist-step${doneAt ? ' is-done' : ''}`}>
      <span className="atlas-checklist-step-mark" aria-hidden="true">{doneAt ? <CheckIcon /> : n}</span>
      <span className="atlas-checklist-step-body">
        <span className="atlas-checklist-step-title">{title}</span>
        {doneAt && <span className="atlas-checklist-step-time atlas-status-line">{stampTime(doneAt)}</span>}
      </span>
      <span className="atlas-checklist-step-action">{children}</span>
    </li>
  )
}

function SessionChecklist({ session, isToday, index }) {
  const { checkStep } = useSchedule()
  const toast = useToast()
  const participant = useParticipant(session.participantId)
  const phone = session.phone || participant?.phone || null
  const status = STATUS[session.status] ? session.status : 'booked'
  const closed = session.status === 'cancelled'
  const canAct = isToday && !closed

  const mark = (step, message) => {
    checkStep(session.id, step)
    toast(message)
  }

  return (
    <article
      className={`atlas-checklist-card atlas-raised atlas-row-in${closed ? ' is-closed' : ''}`}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
      aria-label={`${clock(session.start)}, ${session.name}`}
    >
      <header className="atlas-checklist-card-head">
        <span className="atlas-checklist-time">{clock(session.start)}<span className="atlas-checklist-time-end"> – {clock(session.end)}</span></span>
        <span className="atlas-checklist-status"><StatusDot status={status} pulse={status === 'insession'} /> {STATUS[status].label}</span>
      </header>
      <h2 className="atlas-checklist-name">{session.name}</h2>
      {session.location && (
        <p className="atlas-checklist-location"><PinIcon className="atlas-checklist-pin" />{session.location}</p>
      )}

      {closed ? (
        <p className="atlas-checklist-note">Cancelled{session.cancelReason ? `: ${session.cancelReason}` : ''}. Nothing to do.</p>
      ) : (
        <ol className="atlas-checklist-steps">
          <Step n={1} title="Arrive at the location" doneAt={session.arrivedAt}>
            {!session.arrivedAt && (
              <button type="button" className="atlas-checklist-btn" disabled={!canAct} onClick={() => mark('arrived', 'Arrival saved')}>
                I’m here
              </button>
            )}
          </Step>
          <Step n={2} title={`Call ${firstName(session.name)}`} doneAt={session.contactedAt}>
            {!isToday ? (
              <span className="atlas-checklist-later">On the day</span>
            ) : phone ? (
              <a
                className="atlas-checklist-btn atlas-checklist-btn--call"
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                onClick={() => checkStep(session.id, 'contacted')}
                aria-label={`Call ${session.name} at ${phone}`}
              >
                {session.contactedAt ? 'Call again' : 'Call'}
                <span className="atlas-checklist-phone">{phone}</span>
              </a>
            ) : (
              <span className="atlas-checklist-later">No phone on file</span>
            )}
          </Step>
          <Step n={3} title="Confirm" doneAt={session.confirmedAt}>
            {!session.confirmedAt && (
              <button
                type="button"
                className="atlas-checklist-btn atlas-checklist-btn--primary"
                disabled={!canAct || !session.arrivedAt}
                title={session.arrivedAt ? undefined : 'Arrive first'}
                onClick={() => mark('confirmed', `${firstName(session.name)} confirmed`)}
              >
                Confirm
              </button>
            )}
          </Step>
        </ol>
      )}
    </article>
  )
}

export default function ChecklistView() {
  const { sessions } = useSchedule()
  const { isModerator, email, canBook } = useRole()
  const { moderators, name: moderatorName } = useModerators()
  const { attention, setOpen } = useSync()
  const goTo = useViewNavigate()
  const [day, setDay] = useState('today')
  // A moderator sees only their own sessions; others can pick one or see all.
  const [moderator, setModerator] = useState(isModerator ? email : 'all')

  useEffect(() => { document.title = 'Atlas | Checklist' }, [])

  const date = addDays(TODAY, DAYS.find((d) => d.id === day)?.offset ?? 0)
  const shown = useMemo(() => sessions
    .filter((s) => s.date === date && (moderator === 'all' || (moderator === UNASSIGNED ? !s.moderator : s.moderator === moderator)))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start)), [sessions, date, moderator])
  const open = shown.filter((s) => s.status !== 'cancelled')
  const done = open.filter((s) => s.confirmedAt).length
  const whoName = moderator === 'all' ? 'All moderators' : moderator === UNASSIGNED ? 'Unassigned' : isModerator ? 'Your sessions' : moderatorName(moderator)
  const billable = shown.reduce((h, s) => h + billableHours(s), 0)

  return (
    <div className="atlas-checklist">
      <header className="atlas-checklist-top">
        <div className="atlas-checklist-brand">
          <span className="atlas-sidebar-logo atlas-well-sm atlas-checklist-logo"><LogoIcon /></span>
          <span className="atlas-eyebrow">Atlas Checklist</span>
        </div>
        <div className="atlas-checklist-top-tools">
          {attention > 0 && (
            <button type="button" className="atlas-checklist-sync" onClick={() => setOpen(true)}>
              {attention} not saved
            </button>
          )}
          {canBook && <button type="button" className="atlas-checklist-back atlas-link-quiet" onClick={() => goTo('/day')}>Schedule</button>}
          <AccountMenu placement="top" />
        </div>
      </header>

      <main data-view-content className="atlas-checklist-main atlas-view-enter">
        <div className="atlas-checklist-intro">
          <h1 className="atlas-checklist-title">{longDayLabel(date)}</h1>
          <p className="atlas-checklist-sub">
            {whoName} · {open.length ? `${done} of ${open.length} confirmed` : 'no sessions'}
            {billable > 0 && ` · ${formatHours(billable)} billable`}
          </p>
        </div>

        <div className="atlas-checklist-controls">
          <Segmented value={day} onChange={setDay} options={DAYS} label="Day" />
          {!isModerator && (
            <label className="atlas-checklist-moderator">
              <span className="atlas-eyebrow">Moderator</span>
              <select className="atlas-input atlas-checklist-moderator-select" value={moderator} onChange={(e) => setModerator(e.target.value)}>
                <option value="all">All moderators</option>
                <option value={UNASSIGNED}>Unassigned</option>
                {moderators.map((m) => <option key={m.email} value={m.email}>{shownName(m)} · {m.displayName}</option>)}
              </select>
            </label>
          )}
        </div>

        <section key={`${day}-${moderator}`} className="atlas-checklist-list atlas-swap-in" aria-live="polite">
          {shown.length ? shown.map((s, i) => (
            <SessionChecklist key={s.id} session={s} isToday={day === 'today'} index={i} />
          )) : (
            <p className="atlas-checklist-empty atlas-raised">
              No sessions for {isModerator ? 'you' : whoName} {day === 'today' ? 'today' : 'tomorrow'}.
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
