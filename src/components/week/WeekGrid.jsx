import { Fragment } from 'react'
import { TODAY, toMinutes } from '../../data/schedule.js'
import { weekOf } from '../../lib/dates.js'
import { useStagger } from '../../motion/motion.js'
import { overlaps } from '../../state/ScheduleContext.jsx'
import CalendarEvent from './CalendarEvent.jsx'

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i) // 08:00 - 21:00
const pad = (n) => String(n).padStart(2, '0')

// Greedy lane assignment so overlapping sessions sit side by side.
function layoutLanes(daySessions) {
  const sorted = [...daySessions].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const laneOf = new Map()
  const laneEnds = []
  for (const s of sorted) {
    let lane = laneEnds.findIndex((end) => end <= toMinutes(s.start))
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = toMinutes(s.end)
    laneOf.set(s.id, lane)
  }
  const result = new Map()
  for (const s of sorted) {
    const group = sorted.filter((o) => o === s || overlaps(o, s))
    const lanes = Math.max(...group.map((o) => laneOf.get(o.id))) + 1
    result.set(s.id, { lane: laneOf.get(s.id), lanes })
  }
  return result
}

// Hour-by-day timeline grid. Each session renders in the cell of the hour it starts in.
export default function WeekGrid({ sessions, weekDate = TODAY }) {
  const week = weekOf(weekDate)
  const inWeek = sessions.filter((s) => s.date >= week[0].date && s.date <= week[6].date)
  const delay = useStagger(
    [...inWeek].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)).map((s) => s.id),
    70,
  )
  const lanes = new Map()
  week.forEach((d) => {
    layoutLanes(inWeek.filter((s) => s.date === d.date)).forEach((v, k) => lanes.set(k, v))
  })

  const at = (date, hour) =>
    inWeek.filter((s) => s.date === date && Number(s.start.slice(0, 2)) === hour)

  return (
    <div className="atlas-week-grid">
      <div className="atlas-week-day-head" />
      {week.map((d) => {
        const today = d.date === TODAY
        return (
          <div key={d.date} className={`atlas-week-day-head${today ? ' atlas-week-day-head--today' : ''}`}>
            <div className="atlas-eyebrow atlas-week-day-name">{d.dow.toUpperCase()}</div>
            <div className="atlas-week-day-num">{d.day}</div>
          </div>
        )
      })}

      {HOURS.map((h) => (
        <Fragment key={h}>
          <div className="atlas-week-hour">{pad(h)}:00</div>
          {week.map((d) => (
            <div key={d.date} className="atlas-week-slot">
              {at(d.date, h).map((s) => (
                <CalendarEvent
                  key={s.id}
                  session={s}
                  {...lanes.get(s.id)}
                  style={delay(s.id)}
                />
              ))}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  )
}
