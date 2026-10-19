import { useState } from 'react'
import { TEAMS, TODAY, teamShort } from '../../data/schedule.js'
import { addDays, longDayLabel, weekOf, weekRangeLabel } from '../../lib/dates.js'
import { checkDetails, checkTimes, conflictMessage, displayNames, findConflict } from '../../lib/bookings.js'
import { pressProps } from '../../motion/motion.js'
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
  const { sessions, addSession, openBooking } = useSchedule()
  const toast = useToast()
  const [form, setForm] = useState(DEFAULTS)
  const [slide, setSlide] = useState({ dir: null, key: 0 })
  const [shakeKey, setShakeKey] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [more, setMore] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const week = weekOf(form.date)

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
    toast(`Booked ${longDayLabel(form.date)} · ${form.start} – ${form.end} · Team ${teamShort(form.team)}`)
    setForm((f) => ({ ...DEFAULTS, date: f.date }))
    setMore(false)
    openBooking(created.id)
  }

  return (
    <section className="atlas-booking atlas-raised">
      <div className="atlas-booking-head">
        <h2 className="atlas-booking-title">New Booking</h2>
        <div
          key={resetKey}
          className={`atlas-booking-reset atlas-icon-btn atlas-raised-sm${resetKey ? ' atlas-spin-once' : ''}`}
          title="Start a new booking"
          {...pressProps(reset, 'Start a new booking')}
        >
          <PlusIcon />
        </div>
      </div>

      <div className="atlas-booking-week">
        <div className="atlas-booking-week-head">
          <span className="atlas-booking-range">{weekRangeLabel(week)}</span>
          <div className="atlas-booking-week-nav">
            <button className="atlas-booking-week-btn atlas-icon-btn atlas-raised-sm" aria-label="Previous week" onClick={() => shiftWeek(-1)}>&lt;</button>
            <button className="atlas-booking-week-btn atlas-icon-btn atlas-raised-sm" aria-label="Next week" onClick={() => shiftWeek(1)}>&gt;</button>
          </div>
        </div>
        <div
          key={slide.key}
          className={`atlas-date-strip atlas-no-scrollbar${slide.dir ? ` atlas-slide-${slide.dir}` : ''}`}
        >
          {week.map((d) => {
            const active = d.date === form.date
            return (
              <div
                key={d.date}
                className={`atlas-date-chip${active ? ' is-active' : ''}`}
                aria-pressed={active}
                {...pressProps(() => set({ date: d.date }), longDayLabel(d.date))}
              >
                <span className="atlas-date-chip-dow">{d.dow}</span>
                <span className="atlas-date-chip-day">{d.day}</span>
              </div>
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
        <span
          className="atlas-booking-more atlas-link"
          aria-expanded={more}
          {...pressProps(() => setMore((m) => !m), more ? 'Hide contact and notes' : 'Add contact and notes')}
        >
          {more ? '− HIDE CONTACT & NOTES' : '+ CONTACT & NOTES'}
        </span>
        {more && (
          <div className="atlas-booking-extra atlas-rise">
            <TextField label="EMAIL" type="email" value={form.email} placeholder="name@example.com" onChange={(v) => set({ email: v })} />
            <TextField label="PHONE" type="tel" value={form.phone} placeholder="Optional" onChange={(v) => set({ phone: v })} />
            <TextField label="NOTES" multiline value={form.notes} placeholder="Access, parking, anything the team should know" onChange={(v) => set({ notes: v })} />
          </div>
        )}
      </div>

      <div className="atlas-booking-teams">
        <div className="atlas-booking-teams-head">
          <label className="atlas-eyebrow">ASSIGN A TEAM</label>
          <span className="atlas-team-create atlas-link">CREATE NEW</span>
        </div>
        <TeamPicker value={form.team} onChange={(team) => set({ team })} />
      </div>

      <div className="atlas-booking-footer">
        <button className="atlas-btn-primary" onClick={book}>Book Session</button>
      </div>
    </section>
  )
}
