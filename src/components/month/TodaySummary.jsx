import { teamShort } from '../../data/schedule.js'
import { longDayLabel } from '../../lib/dates.js'
import { useStagger } from '../../motion/motion.js'
import useViewNavigate from '../../motion/useViewNavigate.js'
import { StatusDot } from '../StatusLegend.jsx'
import { useBookingTriggers } from '../../state/ScheduleContext.jsx'

// "Today's sessions" strip above the month grid. The month view decides what is
// shown (cancelled sessions are left out, as in the design, unless filtered for).
export default function TodaySummary({ date, sessions }) {
  const goTo = useViewNavigate()
  const triggers = useBookingTriggers()
  const delay = useStagger(sessions.map((s) => s.id))

  return (
    <section className="atlas-today">
      <div className="atlas-today-head">
        <span className="atlas-eyebrow atlas-today-title">{longDayLabel(date).toUpperCase()} • TODAY'S SESSIONS</span>
        <button type="button" className="atlas-today-link atlas-link-quiet" onClick={() => goTo('/day')}>
          VIEW FULL DAY →
        </button>
      </div>
      <div className="atlas-today-strip">
        {sessions.map((s) => {
          const live = s.status === 'insession'
          return (
            <div
              key={s.id}
              className={`atlas-today-item${live ? ' atlas-today-item--live' : ''} atlas-row-in`}
              style={delay(s.id)}
              {...triggers(s)}
              aria-label={`${s.name} at ${s.start}, open booking`}
            >
              <StatusDot status={s.status} pulse={live} />
              <div className="atlas-today-text">
                <span className="atlas-today-client">{s.summary}</span>
                <span className="atlas-today-meta">
                  {teamShort(s.team)} • {s.start}
                </span>
              </div>
            </div>
          )
        })}
        {sessions.length === 0 && <span className="atlas-empty atlas-row-in">No sessions today match these filters.</span>}
      </div>
    </section>
  )
}
