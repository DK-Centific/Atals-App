import { useEffect, useRef, useState } from 'react'
import { STATUS, TODAY, TEAMS, teamShort } from '../../data/schedule.js'
import { longDayLabel } from '../../lib/dates.js'
import {
  checkDetails, checkTimes, conflictMessage, displayNames, findConflict, isLocked, slotLabel,
} from '../../lib/bookings.js'
import { useToast } from '../../motion/Toast.jsx'
import { sessionsOn, useBookingTriggers, useSchedule } from '../../state/ScheduleContext.jsx'
import { StatusDot } from '../StatusLegend.jsx'
import { TeamPicker, TextField, TimeField } from './Fields.jsx'

const CLOSE_MS = 360 // matches the sheet transition in index.css

const PILL_CLASS = {
  completed: 'atlas-status-pill atlas-status-pill--completed',
  cancelled: 'atlas-status-pill atlas-status-pill--cancelled',
  insession: 'atlas-status-pill atlas-status-pill--insession',
  booked: 'atlas-status-pill atlas-status-pill--booked',
}

const TITLES = { edit: 'Edit booking', reschedule: 'Reschedule', cancel: 'Cancel booking' }

// Side sheet for one booking (view, edit, reschedule, cancel) or one day's bookings.
// It stays mounted for a moment after closing so it can slide away.
export default function BookingDrawer() {
  const { panel, closePanel, sessions } = useSchedule()
  const [shown, setShown] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (panel) {
      setShown(panel)
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const t = setTimeout(() => setShown(null), CLOSE_MS)
    return () => clearTimeout(t)
  }, [panel])

  useEffect(() => {
    if (!panel) return undefined
    const onKey = (e) => { if (e.key === 'Escape') closePanel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panel, closePanel])

  if (!shown) return null
  const session = shown.id ? sessions.find((s) => s.id === shown.id) : null

  return (
    <div className={`atlas-sheet-layer${visible ? ' is-show' : ''}`}>
      <div className="atlas-sheet-scrim" onClick={closePanel} />
      <aside
        className="atlas-sheet atlas-raised"
        role="dialog"
        aria-modal="true"
        aria-label={session ? `Booking: ${session.name}` : 'Bookings for the day'}
      >
        {session
          ? <BookingSheet key={`${session.id}-${shown.mode}`} session={session} mode={shown.mode} />
          : shown.date && <DaySheet date={shown.date} />}
      </aside>
    </div>
  )
}

function SheetHead({ eyebrow, title, children }) {
  const { closePanel } = useSchedule()
  const closeRef = useRef(null)
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }) }, [])
  return (
    <header className="atlas-sheet-head">
      <div className="atlas-sheet-head-text">
        {eyebrow}
        <h2 className="atlas-sheet-title">{title}</h2>
        {children}
      </div>
      <button ref={closeRef} className="atlas-sheet-close atlas-icon-btn atlas-raised-sm" aria-label="Close" onClick={closePanel}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  )
}

const StatusPill = ({ status }) => (
  <span className={PILL_CLASS[status]}>
    <StatusDot status={status} pulse={status === 'insession'} />
    {STATUS[status].label}
  </span>
)

function BookingSheet({ session, mode }) {
  if (isLocked(session.status)) return <BookingDetails session={session} />
  if (mode === 'reschedule' && session.status !== 'booked') return <BookingDetails session={session} />
  if (mode === 'edit') return <EditForm session={session} />
  if (mode === 'reschedule') return <RescheduleForm session={session} />
  if (mode === 'cancel') return <CancelForm session={session} />
  return <BookingDetails session={session} />
}

/* ---------- View ---------- */

function BookingDetails({ session: s }) {
  const { openBooking, startSession, completeSession, sessions } = useSchedule()
  const toast = useToast()
  const locked = isLocked(s.status)
  const team = TEAMS.find((t) => t.id === s.team)

  const start = () => {
    const live = sessions.find((o) => o.status === 'insession' && o.id !== s.id)
    if (live) return toast(`Finish ${live.name}’s session first.`, 'error')
    startSession(s.id)
    toast(`${s.name} is now in session`)
  }

  const complete = () => {
    completeSession(s.id)
    toast(`${s.name} marked completed`)
  }

  return (
    <>
      <SheetHead eyebrow={<StatusPill status={s.status} />} title={s.name}>
        <div className="atlas-sheet-sub">{slotLabel(s)}</div>
        {s.rescheduledFrom && (
          <div className="atlas-sheet-note">Rescheduled from {slotLabel(s.rescheduledFrom)}</div>
        )}
      </SheetHead>

      <div className="atlas-sheet-body">
        {s.status === 'cancelled' && (
          <div className="atlas-sheet-alert">
            <div className="atlas-eyebrow atlas-sheet-alert-title">CANCELLED</div>
            {s.cancelReason || 'No reason given.'}
          </div>
        )}

        <dl className="atlas-detail-grid">
          <Detail label="TEAM">
            <span className="atlas-detail-team">
              <span className="atlas-team-badge atlas-detail-team-badge">{team?.code}</span>
              {team?.name ?? teamShort(s.team)}
            </span>
          </Detail>
          <Detail label="LOCATION">{s.location || '—'}</Detail>
          <Detail label="EMAIL">
            {s.email ? <a className="atlas-detail-link" href={`mailto:${s.email}`}>{s.email}</a> : '—'}
          </Detail>
          <Detail label="PHONE">
            {s.phone ? <a className="atlas-detail-link" href={`tel:${s.phone}`}>{s.phone}</a> : '—'}
          </Detail>
          <Detail label="PROTOCOL">{s.protocol || 'Standard'}</Detail>
          <Detail label="NOTES" wide>{s.notes || '—'}</Detail>
        </dl>

        <Activity session={s} />
      </div>

      <footer className="atlas-sheet-foot">
        {locked ? (
          <div className="atlas-sheet-locked">
            {s.status === 'completed' ? 'Completed bookings are kept as a record.' : 'Cancelled bookings stay on the calendar for reference.'}
          </div>
        ) : (
          <>
            {s.status === 'booked' && s.date === TODAY && (
              <button className="atlas-btn-primary" onClick={start}>Start session</button>
            )}
            {s.status === 'insession' && (
              <button className="atlas-btn-primary" onClick={complete}>Mark completed</button>
            )}
            <div className="atlas-sheet-actions">
              <button className="atlas-btn-ghost" onClick={() => openBooking(s.id, 'edit')}>Edit</button>
              {s.status === 'booked' && (
                <button className="atlas-btn-ghost" onClick={() => openBooking(s.id, 'reschedule')}>Reschedule</button>
              )}
              <button className="atlas-btn-danger" onClick={() => openBooking(s.id, 'cancel')}>Cancel</button>
            </div>
          </>
        )}
      </footer>
    </>
  )
}

const Detail = ({ label, wide, children }) => (
  <div className={`atlas-detail${wide ? ' atlas-detail--wide' : ''}`}>
    <dt className="atlas-eyebrow">{label}</dt>
    <dd className="atlas-detail-value">{children}</dd>
  </div>
)

const when = (iso) => new Date(iso).toLocaleString(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
})

function Activity({ session }) {
  const history = [...(session.history ?? [])].reverse()
  return (
    <section className="atlas-activity">
      <div className="atlas-eyebrow">ACTIVITY</div>
      {history.length === 0 && <div className="atlas-activity-empty">Imported with the schedule.</div>}
      <ol className="atlas-activity-list">
        {history.map((h, i) => (
          <li key={i} className="atlas-activity-item">
            <span className="atlas-activity-dot" />
            <div className="atlas-activity-text">
              <span className="atlas-activity-label">{h.text}</span>
              {h.from && <span className="atlas-activity-meta">{slotLabel(h.from)} → {slotLabel(h.to)}</span>}
              {h.reason && <span className="atlas-activity-meta">“{h.reason}”</span>}
              <span className="atlas-activity-time">{when(h.at)}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- Edit ---------- */

function useFormSheet(session) {
  const { openBooking } = useSchedule()
  const toast = useToast()
  const [shakeKey, setShakeKey] = useState(0)
  const back = () => openBooking(session.id)
  const fail = (message) => {
    setShakeKey((k) => k + 1)
    toast(message, 'error')
  }
  return { back, fail, shakeKey, toast }
}

function EditForm({ session }) {
  const { sessions, updateSession } = useSchedule()
  const { back, fail, shakeKey, toast } = useFormSheet(session)
  const [form, setForm] = useState({
    name: session.name, location: session.location ?? '', email: session.email ?? '',
    phone: session.phone ?? '', protocol: session.protocol ?? '', notes: session.notes ?? '', team: session.team,
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const save = () => {
    const clash = form.team !== session.team && findConflict(sessions, { ...session, team: form.team }, session.id)
    const problem = checkDetails(form) ?? (clash && conflictMessage(clash))
    if (problem) return fail(problem)
    updateSession(session.id, {
      ...displayNames(form.name),
      location: form.location.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      protocol: form.protocol.trim(),
      notes: form.notes.trim(),
      team: form.team,
    })
    toast('Booking updated')
    back()
  }

  return (
    <FormShell session={session} mode="edit" onBack={back} onSave={save} saveLabel="Save changes" shakeKey={shakeKey}>
      <TextField label="PARTICIPANT" value={form.name} onChange={(v) => set({ name: v })} autoFocus />
      <TextField label="LOCATION" value={form.location} placeholder="Address or meeting link" onChange={(v) => set({ location: v })} />
      <div className="atlas-field-row">
        <TextField label="EMAIL" type="email" value={form.email} onChange={(v) => set({ email: v })} />
        <TextField label="PHONE" type="tel" value={form.phone} onChange={(v) => set({ phone: v })} />
      </div>
      <TextField label="PROTOCOL" value={form.protocol} placeholder="Standard" onChange={(v) => set({ protocol: v })} />
      <TextField label="NOTES" multiline value={form.notes} onChange={(v) => set({ notes: v })} />
      <div className="atlas-field">
        <span className="atlas-eyebrow">TEAM</span>
        <TeamPicker value={form.team} onChange={(team) => set({ team })} />
      </div>
    </FormShell>
  )
}

/* ---------- Reschedule ---------- */

function RescheduleForm({ session }) {
  const { sessions, rescheduleSession } = useSchedule()
  const { back, fail, shakeKey, toast } = useFormSheet(session)
  const [slot, setSlot] = useState({ date: session.date, start: session.start, end: session.end })
  const [reason, setReason] = useState('')
  const set = (patch) => setSlot((f) => ({ ...f, ...patch }))

  const save = () => {
    if (slot.date === session.date && slot.start === session.start && slot.end === session.end) {
      return fail('Pick a new date or time.')
    }
    const clash = findConflict(sessions, { ...slot, team: session.team }, session.id)
    const problem = checkTimes(slot) ?? (clash && conflictMessage(clash))
    if (problem) return fail(problem)
    rescheduleSession(session.id, slot, reason.trim())
    toast(`Moved to ${slotLabel(slot)}`)
    back()
  }

  return (
    <FormShell session={session} mode="reschedule" onBack={back} onSave={save} saveLabel="Reschedule" shakeKey={shakeKey}>
      <div className="atlas-sheet-current">
        <span className="atlas-eyebrow">CURRENTLY</span>
        <span className="atlas-sheet-current-slot">{slotLabel(session)}</span>
      </div>
      <TextField label="NEW DATE" type="date" value={slot.date} onChange={(v) => set({ date: v })} autoFocus />
      <div className="atlas-booking-times atlas-booking-times--sheet">
        <TimeField label="START TIME" value={slot.start} onChange={(v) => set({ start: v })} />
        <TimeField label="END TIME" value={slot.end} onChange={(v) => set({ end: v })} />
      </div>
      <TextField label="REASON (OPTIONAL)" multiline value={reason} placeholder="e.g. Participant asked for a later slot" onChange={setReason} />
    </FormShell>
  )
}

/* ---------- Cancel ---------- */

function CancelForm({ session }) {
  const { cancelSession } = useSchedule()
  const { back, toast } = useFormSheet(session)
  const [reason, setReason] = useState('')

  const confirm = () => {
    cancelSession(session.id, reason.trim())
    toast(`Cancelled ${session.name} · ${session.start}`, 'error')
    back()
  }

  return (
    <FormShell session={session} mode="cancel" onBack={back} onSave={confirm} saveLabel="Cancel booking" backLabel="Keep booking" danger>
      <div className="atlas-sheet-alert">
        This booking will be marked <strong className="atlas-sheet-alert-strong">Cancelled</strong>. It stays on the calendar for reference and can’t be edited afterwards.
      </div>
      <TextField label="REASON (OPTIONAL)" multiline value={reason} placeholder="e.g. Participant unavailable, team reassigned…" onChange={setReason} autoFocus />
    </FormShell>
  )
}

function FormShell({ session, mode, onBack, onSave, saveLabel, backLabel = 'Back', danger = false, shakeKey = 0, children }) {
  return (
    <>
      <SheetHead eyebrow={<StatusPill status={session.status} />} title={TITLES[mode]}>
        <div className="atlas-sheet-sub">{session.name} · {slotLabel(session)}</div>
      </SheetHead>
      <form
        className="atlas-sheet-form"
        onSubmit={(e) => { e.preventDefault(); onSave() }}
      >
        <div key={shakeKey} className={`atlas-sheet-body${shakeKey ? ' atlas-shake' : ''}`}>{children}</div>
        <footer className="atlas-sheet-foot">
          <div className="atlas-sheet-actions">
            <button type="button" className="atlas-btn-ghost" onClick={onBack}>{backLabel}</button>
            <button type="submit" className={danger ? 'atlas-btn-danger atlas-btn-danger--solid' : 'atlas-btn-primary atlas-btn-primary--compact'}>{saveLabel}</button>
          </div>
        </footer>
      </form>
    </>
  )
}

/* ---------- One day's bookings (from the Month grid) ---------- */

function DaySheet({ date }) {
  const { sessions } = useSchedule()
  const triggers = useBookingTriggers()
  const list = sessionsOn(sessions, date)

  return (
    <>
      <SheetHead eyebrow={<span className="atlas-eyebrow">BOOKINGS</span>} title={longDayLabel(date)} />
      <div className="atlas-sheet-body">
        {list.length === 0 && <div className="atlas-activity-empty">No bookings on this day.</div>}
        {list.map((s) => (
          <div key={s.id} className="atlas-day-item atlas-rise" {...triggers(s)}>
            <StatusDot status={s.status} pulse={s.status === 'insession'} />
            <div className="atlas-day-item-text">
              <span className="atlas-day-item-name">{s.name}</span>
              <span className="atlas-day-item-meta">{s.start} – {s.end} · {teamShort(s.team)}</span>
            </div>
            <span className="atlas-eyebrow atlas-day-item-status">{STATUS[s.status].weekLabel}</span>
          </div>
        ))}
      </div>
    </>
  )
}
