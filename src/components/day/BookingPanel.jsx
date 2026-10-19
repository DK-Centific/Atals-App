import { useState } from 'react'
import { TEAMS, TODAY, teamShort, toMinutes } from '../../data/schedule.js'
import { addDays, longDayLabel, weekOf, weekRangeLabel } from '../../lib/dates.js'
import { pressProps } from '../../motion/motion.js'
import { useToast } from '../../motion/Toast.jsx'
import { useSchedule } from '../../state/ScheduleContext.jsx'
import { CheckIcon, ClockIcon, PlusIcon } from '../Icons.jsx'

const DEFAULTS = { date: TODAY, start: '17:00', end: '19:00', team: TEAMS[0].id }

// "New Booking" form: pick a day, a time range and a team, then book.
export default function BookingPanel() {
  const { addSession } = useSchedule()
  const toast = useToast()
  const [form, setForm] = useState(DEFAULTS)
  const [slide, setSlide] = useState({ dir: null, key: 0 })
  const [shakeKey, setShakeKey] = useState(0)
  const [resetKey, setResetKey] = useState(0)
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

  const book = () => {
    if (toMinutes(form.end) <= toMinutes(form.start)) {
      setShakeKey((k) => k + 1)
      toast('End time must be after the start time.', 'error')
      return
    }
    addSession({
      date: form.date,
      start: form.start,
      end: form.end,
      team: form.team,
      status: 'booked',
      name: 'New Session',
      short: 'New Session',
      summary: 'New Session',
      location: 'Location to be confirmed',
    })
    toast(`Booked ${longDayLabel(form.date)} · ${form.start} – ${form.end} · Team ${teamShort(form.team)}`)
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

      <div className="atlas-booking-teams">
        <div className="atlas-booking-teams-head">
          <label className="atlas-eyebrow">ASSIGN A TEAM</label>
          <span className="atlas-team-create atlas-link">CREATE NEW</span>
        </div>
        <div className="atlas-team-list">
          {TEAMS.map((t) => {
            const active = t.id === form.team
            return (
              <div
                key={t.id}
                className={`atlas-team-option${active ? ' is-active' : ''}`}
                aria-pressed={active}
                {...pressProps(() => set({ team: t.id }), t.name)}
              >
                <div className="atlas-team-badge">{t.code}</div>
                <span className="atlas-team-name">{t.name}</span>
                <div className="atlas-team-check"><CheckIcon /></div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="atlas-booking-footer">
        <button className="atlas-btn-primary" onClick={book}>Book Session</button>
      </div>
    </section>
  )
}

function TimeField({ label, value, onChange }) {
  return (
    <div className="atlas-time-field">
      <label className="atlas-eyebrow">{label}</label>
      <div className="atlas-time-input-wrap">
        <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="atlas-input" />
        <ClockIcon />
      </div>
    </div>
  )
}
