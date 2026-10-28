import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import { StatusDot } from '../components/StatusLegend.jsx'
import { STATUS, TODAY } from '../data/schedule.js'
import { HOURLY_RATE, MILEAGE_RATE, billableHours, formatHours, formatUsd, isBillable } from '../lib/billing.js'
import { estimateNote, formatMi, roundTrip, useOneWayMiles } from '../lib/mileage.js'
import { shortDate, weekOf, weekRangeLabel } from '../lib/dates.js'
import CountUp from '../motion/CountUp.jsx'
import useSlidingPill from '../motion/useSlidingPill.js'
import { useSchedule } from '../state/ScheduleContext.jsx'
import { useModerators } from '../state/ModeratorContext.jsx'
import { useParticipants } from '../state/ParticipantContext.jsx'

// Admin > Production tracker. Everything is counted from the bookings
// (Atlas_Bookings): no separate tracker list. Status colours are Atlas's status
// tokens and always come with a label, so colour is never the only cue.

/** Sessions the team aims to complete each week (Oct 21 meeting: up to 70). */
const WEEKLY_TARGET = 70
const ORDER = ['completed', 'insession', 'booked', 'cancelled']
const RANGES = [
  { id: 'week', label: 'This week' },
  { id: 'all', label: 'All time' },
]

const statusOf = (s) => (STATUS[s.status] ? s.status : 'booked')
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0)

function countBy(list) {
  const c = { booked: 0, insession: 0, completed: 0, cancelled: 0 }
  for (const s of list) c[statusOf(s)] += 1
  return c
}

function Tile({ label, value, suffix, note, decimals = 0, title }) {
  return (
    <div className="atlas-tracker-tile atlas-well" title={title}>
      <span className="atlas-eyebrow">{label}</span>
      <span className="atlas-tracker-tile-value">{decimals ? value.toFixed(decimals) : <CountUp value={value} />}{suffix}</span>
      {note && <span className="atlas-tracker-tile-note">{note}</span>}
    </div>
  )
}

function Legend() {
  return (
    <div className="atlas-tracker-legend" aria-hidden="true">
      {ORDER.map((k) => <span key={k} className="atlas-tracker-legend-item"><StatusDot status={k} />{STATUS[k].label}</span>)}
    </div>
  )
}

// One 100% bar of every session by status, 2px gaps between segments.
function StatusBar({ counts, total }) {
  return (
    <figure className="atlas-tracker-card atlas-raised-sm">
      <figcaption className="atlas-tracker-card-head">
        <span className="atlas-tracker-card-title">Sessions by status</span>
        <Legend />
      </figcaption>
      <div className="atlas-tracker-bar" role="img" aria-label={ORDER.map((k) => `${STATUS[k].label} ${counts[k]}`).join(', ')}>
        {total ? ORDER.filter((k) => counts[k]).map((k) => (
          <span key={k} className={`atlas-tracker-seg atlas-tracker-seg--${k} atlas-reveal-x`} style={{ flexGrow: counts[k] }} title={`${STATUS[k].label}: ${counts[k]}`} />
        )) : <span className="atlas-tracker-bar-empty" />}
      </div>
      <div className="atlas-tracker-bar-values">
        {ORDER.map((k) => (
          <span key={k} className="atlas-tracker-bar-value">
            <strong>{counts[k]}</strong> {STATUS[k].label.toLowerCase()} · {pct(counts[k], total)}%
          </span>
        ))}
      </div>
    </figure>
  )
}

// Sessions per day this week, stacked by status. Hover or focus a day for its numbers.
function DayColumns({ days }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...days.map((d) => d.total))
  const step = max <= 5 ? 1 : max <= 10 ? 2 : 5
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step).reverse()

  return (
    <figure className="atlas-tracker-card atlas-raised-sm">
      <figcaption className="atlas-tracker-card-head">
        <span className="atlas-tracker-card-title">Sessions per day</span>
        <Legend />
      </figcaption>
      <div className="atlas-tracker-cols">
        <div className="atlas-tracker-axis" aria-hidden="true">
          {ticks.map((t) => <span key={t} className="atlas-tracker-tick">{t}</span>)}
        </div>
        <div className="atlas-tracker-plot">
          {ticks.map((t) => <span key={t} className="atlas-tracker-grid" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden="true" />)}
          {days.map((d, i) => (
            <button
              key={d.date}
              type="button"
              className={`atlas-tracker-col${d.date === TODAY ? ' is-today' : ''}`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${d.dow} ${shortDate(d.date)}: ${d.total} sessions, ${ORDER.map((k) => `${d.counts[k]} ${STATUS[k].label.toLowerCase()}`).join(', ')}`}
            >
              <span className="atlas-tracker-stack" style={{ height: `${(d.total / top) * 100}%` }}>
                {ORDER.filter((k) => d.counts[k]).map((k) => (
                  <span key={k} className={`atlas-tracker-seg atlas-tracker-seg--${k}`} style={{ flexGrow: d.counts[k] }} />
                ))}
              </span>
              {d.total > 0 && <span className="atlas-tracker-col-value" style={{ bottom: `${(d.total / top) * 100}%` }}>{d.total}</span>}
              <span className="atlas-tracker-col-label">{d.dow}</span>
              {hover === i && (
                <span className="atlas-tracker-tip atlas-raised-sm" role="presentation">
                  <span className="atlas-tracker-tip-title">{d.dow}, {shortDate(d.date)}</span>
                  {ORDER.map((k) => (
                    <span key={k} className="atlas-tracker-tip-row"><StatusDot status={k} />{STATUS[k].label}<strong>{d.counts[k]}</strong></span>
                  ))}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </figure>
  )
}

export default function TrackerView() {
  const { sessions } = useSchedule()
  const { moderators, name: moderatorName, fullName } = useModerators()
  const { participants } = useParticipants()
  const oneWay = useOneWayMiles(participants)
  const [range, setRange] = useState('week')
  const { trackRef, pillProps } = useSlidingPill(range)
  const week = weekOf(TODAY)

  useEffect(() => { document.title = 'Atlas | Production tracker' }, [])

  const inRange = useMemo(() => (range === 'week'
    ? sessions.filter((s) => s.date >= week[0].date && s.date <= week[6].date)
    : sessions), [sessions, range, week])

  const counts = countBy(inRange)
  const total = inRange.length
  const scheduled = total - counts.cancelled
  const weekDone = countBy(sessions.filter((s) => s.date >= week[0].date && s.date <= week[6].date)).completed
  // Checklist: of the sessions that were due by today (not cancelled), how many the moderator confirmed.
  const due = inRange.filter((s) => s.status !== 'cancelled' && s.date <= TODAY)
  const confirmed = due.filter((s) => s.confirmedAt).length

  const days = week.map((d) => {
    const list = sessions.filter((s) => s.date === d.date)
    return { ...d, counts: countBy(list), total: list.length }
  })

  // Every active moderator, plus anyone no longer listed who still has sessions here.
  const emails = [...new Set([...moderators.map((m) => m.email), ...inRange.map((s) => s.moderator).filter(Boolean)])]
  const rows = emails.map((email) => {
    const list = inRange.filter((s) => s.moderator === email)
    const c = countBy(list)
    const modDue = list.filter((s) => s.status !== 'cancelled' && s.date <= TODAY)
    // Completed sessions are billable: their hours and round-trip miles.
    const done = list.filter(isBillable)
    const trips = done.map((s) => roundTrip(oneWay, s))
    const upcoming = list.filter((s) => s.status === 'booked' || s.status === 'insession').map((s) => roundTrip(oneWay, s))
    const sum = (xs) => xs.reduce((n, t) => n + (t?.miles ?? 0), 0)
    const hours = done.reduce((h, s) => h + billableHours(s), 0)
    const miles = sum(trips)
    return {
      email, name: moderatorName(email), full: fullName(email), c,
      assigned: list.length - c.cancelled,
      confirmed: modDue.filter((s) => s.confirmedAt).length, due: modDue.length,
      recorded: list.filter((s) => s.recordings?.some((r) => r.status === 'completed')).length,
      qaPassed: list.filter((s) => s.qa?.onsite_check?.result === 'passed').length,
      hours, miles, approx: trips.some((t) => t?.approx), unmapped: trips.filter((t) => !t).length, note: estimateNote(trips),
      planned: sum(upcoming), plannedApprox: upcoming.some((t) => t?.approx), plannedNote: estimateNote(upcoming),
      mileagePay: miles * MILEAGE_RATE, laborPay: hours * HOURLY_RATE,
    }
  }).filter((r) => r.c.booked + r.c.insession + r.c.completed + r.c.cancelled > 0 || moderators.some((m) => m.email === r.email))
    .sort((a, b) => b.hours - a.hours || b.assigned - a.assigned || a.name.localeCompare(b.name))

  const totals = rows.reduce((t, r) => ({
    assigned: t.assigned + r.assigned, completed: t.completed + r.c.completed, hours: t.hours + r.hours,
    miles: t.miles + r.miles, planned: t.planned + r.planned, mileagePay: t.mileagePay + r.mileagePay,
    laborPay: t.laborPay + r.laborPay, approx: t.approx || r.approx || r.plannedApprox,
  }), { assigned: 0, completed: 0, hours: 0, miles: 0, planned: 0, mileagePay: 0, laborPay: 0, approx: false })

  return (
    <div className="atlas-app atlas-tracker-view">
      <Sidebar />
      <main data-view-content className="atlas-tracker-main atlas-view-enter">
        <div className="atlas-tracker-panel atlas-no-scrollbar">
          <header className="atlas-tracker-head">
            <div>
              <span className="atlas-eyebrow">ADMIN · {range === 'week' ? weekRangeLabel(week).toUpperCase() : 'ALL SESSIONS'}</span>
              <h1 className="atlas-tracker-title">Production tracker</h1>
            </div>
            <div ref={trackRef} className="atlas-view-switch atlas-view-switch--recessed atlas-checklist-segment" role="group" aria-label="Range">
              <div {...pillProps} className={`${pillProps.className} atlas-view-pill`} />
              {RANGES.map((r) => (
                <button key={r.id} type="button" className={`atlas-view-tab${range === r.id ? ' is-active' : ''}`}
                  data-pill-active={range === r.id} aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
          </header>

          <section className="atlas-tracker-tiles" aria-label="Headline numbers">
            <Tile label="Scheduled" value={scheduled} note={`${total} booked in all`} />
            <Tile label="Completed" value={counts.completed} note={`${pct(counts.completed, scheduled)}% of scheduled`} />
            <Tile label="Weekly target" value={pct(weekDone, WEEKLY_TARGET)} suffix="%" note={`${weekDone} of ${WEEKLY_TARGET} this week`} />
            <Tile label="Cancelled" value={counts.cancelled} note={`${pct(counts.cancelled, total)}% of bookings`} />
            <Tile label="Checklist confirmed" value={pct(confirmed, due.length)} suffix="%" note={`${confirmed} of ${due.length} sessions due`} />
            <Tile
              label="Billable hours"
              value={totals.hours}
              decimals={Number.isInteger(totals.hours) ? 0 : 1}
              suffix=" h"
              note={`${formatUsd(totals.laborPay)} at ${formatUsd(HOURLY_RATE)}/h · completed only`}
              title="Only Completed sessions are billable: their scheduled length."
            />
            <Tile
              label="Miles"
              value={Math.round(totals.miles)}
              suffix=" mi"
              note={`${formatUsd(totals.mileagePay)} at $${MILEAGE_RATE}/mi${totals.approx ? ' · approx.' : ''}`}
              title="Round trip HQ to participant and back, for Completed sessions."
            />
          </section>

          <div className="atlas-tracker-charts">
            <StatusBar counts={counts} total={total} />
            <DayColumns days={days} />
          </div>

          <section className="atlas-tracker-card atlas-raised-sm" aria-label="Mileage and billable hours">
            <div className="atlas-tracker-card-head">
              <span className="atlas-tracker-card-title">Mileage &amp; billable hours</span>
              <span className="atlas-tracker-card-note">Completed sessions are billable. Miles are round trips from HQ.</span>
            </div>
            <div className="atlas-tracker-table-wrap atlas-no-scrollbar">
              <table className="atlas-tracker-table atlas-tracker-table--money">
                <thead>
                  <tr>
                    {['Moderator', 'Assigned', 'Completed', 'Billable hours', 'Miles', 'Mileage', 'Labor', 'Upcoming miles'].map((h) => (
                      <th key={h} scope="col" className="atlas-eyebrow">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.email}>
                      <th scope="row" title={r.full}>{r.name}</th>
                      <td>{r.assigned}</td>
                      <td>{r.c.completed}</td>
                      <td>{formatHours(r.hours)}</td>
                      <td title={[r.note, r.unmapped && `${r.unmapped} session${r.unmapped === 1 ? '' : 's'} with no address to go on, not counted`].filter(Boolean).join('. ') || 'Road routes from HQ'}>
                        {formatMi(r.miles)}{r.approx && <span className="atlas-tracker-approx"> approx.</span>}
                      </td>
                      <td>{formatUsd(r.mileagePay)}</td>
                      <td>{formatUsd(r.laborPay)}</td>
                      <td className="atlas-tracker-muted" title={['Booked or in session, not billable yet', r.plannedNote].filter(Boolean).join('. ')}>
                        {formatMi(r.planned)}{r.plannedApprox && r.planned > 0 && <span className="atlas-tracker-approx"> approx.</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td>{totals.assigned}</td>
                    <td>{totals.completed}</td>
                    <td>{formatHours(totals.hours)}</td>
                    <td>{formatMi(totals.miles)}</td>
                    <td>{formatUsd(totals.mileagePay)}</td>
                    <td>{formatUsd(totals.laborPay)}</td>
                    <td className="atlas-tracker-muted">{formatMi(totals.planned)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="atlas-tracker-card atlas-raised-sm" aria-label="By moderator">
            <div className="atlas-tracker-card-head"><span className="atlas-tracker-card-title">By moderator</span></div>
            <div className="atlas-tracker-table-wrap atlas-no-scrollbar">
              <table className="atlas-tracker-table">
                <thead>
                  <tr>
                    {['Moderator', 'Booked', 'Completed', 'In session', 'Cancelled', 'Checklist confirmed', 'Recorded', 'Onsite QA passed'].map((h) => (
                      <th key={h} scope="col" className="atlas-eyebrow">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.email}>
                      <th scope="row" title={r.full}>{r.name}</th>
                      <td>{r.assigned + r.c.cancelled}</td>
                      <td>{r.c.completed}</td>
                      <td>{r.c.insession}</td>
                      <td>{r.c.cancelled}</td>
                      <td>{r.confirmed} / {r.due}</td>
                      <td>{r.recorded}</td>
                      <td>{r.qaPassed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
