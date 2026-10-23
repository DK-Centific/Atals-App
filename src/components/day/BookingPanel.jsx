import { useState } from 'react'
import { TEAMS, TODAY, teamShort } from '../../data/schedule.js'
import { addDays, longDayLabel, weekOf, weekRangeLabel } from '../../lib/dates.js'
import { checkDetails, checkTimes, conflictMessage, displayNames, findConflict } from '../../lib/bookings.js'
import Collapse from '../../motion/Collapse.jsx'
import useSlidingPill from '../../motion/useSlidingPill.js'
import { useToast } from '../../motion/Toast.jsx'
import { useSchedule } from '../../state/ScheduleContext.jsx'
import { PlusIcon } from '../Icons.jsx'
import { TeamPicker, TextField, TimeField } from '../booking/Fields.jsx'

const DEFAULTS = {
  date: TODAY, start: '17:00', end: '19:00', team: TEAMS[0].id,
  name: '', location: '', email: '', phone: '', notes: '',
}

// "New Booking" form: pick a day, a time range, the participant and a team, then book.
export default function BookingPanel() {
  const { sessions, addSession, removeSession, openBooking, setNote, triggerRef } = useSchedule()
  const toast = useToast()
  const [form, setForm] = useState(DEFAULTS)
  const [slide, setSlide] = useState({ dir: null, key: 0 })
  const [shakeKey, setShakeKey] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [more, setMore] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const week = weekOf(form.date)
  const { trackRef, pillProps } = useSlidingPill(`${slide.key}:${form.date}`)

  const shiftWeek = (dir) => {
    set({ date: addDays(form.date, dir * 7) })
    setSlide((s) => ({ dir: dir > 0 ? 'next' : 'prev', key: s.key + 1 }))
  }

  const reset = () => {
    const weekChanged = weekOf(DEFAULTS.date)[0].date !== week[0].date
    setForm(DEFAULTS)
    setResetKey((k) => k + 1)
    if (weekChanged) setSlide((s) => ({ dir: DEFAULTS.date < form.date ? 'prev' : 'next', key: s.key + 1 }))
  }

  const fail = (message) => {
    setShakeKey((k) => k + 1)
    toast(message, 'error')
  }

  const book = () => {
    const clash = findConflict(sessions, form)
    const problem = checkTimes(form) ?? checkDetails(form) ?? (clash && conflictMessage(clash))
    if (problem) return fail(problem)
    const created = addSession({
      date: form.date,
      start: form.start,
      end: form.end,
      team: form.team,
      status: 'booked',
      ...displayNames(form.name),
      location: form.location.trim() || 'Location to be confirmed',
      email: form.email.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim(),
    })
    setForm((f) => ({ ...DEFAULTS, date: f.date }))
    setMore(false)
    triggerRef.current = document.activeElement
    openBooking(created.id)
    // The new booking's panel opens with an inline "Saved" note and Undo.
    setNote({
      id: created.id,
      text: `Booked ${longDayLabel(form.date)} · ${form.start} – ${form.end} · Team ${teamShort(form.team)}`,
      undo: () => removeSession(created.id),
      closes: true,
    })
  }

  return (
    <section className="atlas-booking atlas-raised">
      <div className="atlas-booking-head">
        <h2 className="atlas-booking-title">New Booking</h2>
        <button
          key={resetKey}
          type="button"
          className={`atlas-booking-reset atlas-icon-btn atlas-raised-sm${resetKey ? ' atlas-spin-once' : ''}`}
          title="Start a new booking"
          aria-label="Start a new booking"
          onClick={reset}
        >
          <PlusIcon />
        </button>
      </div>

      <div className="atlas-booking-week">
        <div className="atlas-booking-week-head">
          <span className="atlas-booking-range">{weekRangeLabel(week)}</span>
          <div className="atlas-booking-week-nav">
            <button type="button" className="atlas-booking-week-btn atlas-icon-btn atlas-raised-sm" aria-label="Previous week" onClick={() => shiftWeek(-1)}>&lt;</button>
            <button type="button" className="atlas-booking-week-btn atlas-icon-btn atlas-raised-sm" aria-label="Next week" onClick={() => shiftWeek(1)}>&gt;</button>
          </div>
        </div>
        <div
          key={slide.key}
          ref={trackRef}
          role="group"
          aria-label="Booking date"
          className={`atlas-date-strip atlas-no-scrollbar${slide.dir ? ` atlas-slide-${slide.dir}` : ''}`}
        >
          <div {...pillProps} className={`${pillProps.className} atlas-date-pill`} />
          {week.map((d) => {
            const active = d.date === form.date
            return (
              <button
                key={d.date}
                type="button"
                className={`atlas-date-chip${active ? ' is-active' : ''}`}
                data-pill-active={active}
                aria-pressed={active}
                aria-label={longDayLabel(d.date)}
                onClick={() => set({ date: d.date })}
              >
                <span className="atlas-date-chip-dow">{d.dow}</span>
                <span className="atlas-date-chip-day">{d.day}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div key={shakeKey} className={`atlas-booking-times${shakeKey ? ' atlas-shake' : ''}`}>
        <TimeField label="START TIME" value={form.start} onChange={(v) => set({ start: v })} />
        <TimeField label="END TIME" value={form.end} onChange={(v) => set({ end: v })} />
      </div>

      <div className="atlas-booking-participant">
        <TextField label="PARTICIPANT" value={form.name} placeholder="Full name" onChange={(v) => set({ name: v })} />
        <TextField label="LOCATION" value={form.location} placeholder="Address or meeting link" onChange={(v) => set({ location: v })} />
        <button
          type="button"
          className="atlas-booking-more atlas-link"
          aria-expanded={more}
          aria-controls="atlas-booking-extra"
          onClick={() => setMore((m) => !m)}
        >
          {more ? '− HIDE CONTACT & NOTES' : '+ CONTACT & NOTES'}
        </button>
        <Collapse open={more} id="atlas-booking-extra">
          <div className="atlas-booking-extra">
            <TextField label="EMAIL" type="email" value={form.email} placeholder="name@example.com" onChange={(v) => set({ email: v })} />
            <TextField label="PHONE" type="tel" value={form.phone} placeholder="Optional" onChange={(v) => set({ phone: v })} />
            <TextField label="NOTES" multiline value={form.notes} placeholder="Access, parking, anything the team should know" onChange={(v) => set({ notes: v })} />
          </div>
        </Collapse>
      </div>

      <div className="atlas-booking-teams">
        <div className="atlas-booking-teams-head">
          <label className="atlas-eyebrow">ASSIGN A TEAM</label>
          <button type="button" className="atlas-team-create atlas-link" disabled title="Creating teams isn’t built yet">CREATE NEW</button>
        </div>
        <TeamPicker value={form.team} onChange={(team) => set({ team })} />
      </div>

      <div className="atlas-booking-footer">
        <button type="button" className="atlas-btn-primary" onClick={book}>Book Session</button>
      </div>
    </section>
  )
}
