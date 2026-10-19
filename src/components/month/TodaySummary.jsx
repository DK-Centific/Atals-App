import { teamShort } from '../../data/schedule.js'
import { longDayLabel } from '../../lib/dates.js'
import { pressProps, useStagger } from '../../motion/motion.js'
import useViewNavigate from '../../motion/useViewNavigate.js'
import { StatusDot } from '../StatusLegend.jsx'
import { useBookingTriggers } from '../../state/ScheduleContext.jsx'

// "Today's sessions" strip above the month grid. Cancelled sessions are left out, as in the design.
export default function TodaySummary({ date, sessions }) {
  const goTo = useViewNavigate()
  const triggers = useBookingTriggers()
  const shown = sessions.filter((s) => s.status !== 'cancelled')
  const delay = useStagger(shown.map((s) => s.id), 60)

  return (
    <section className="atlas-today">
      <div className="atlas-today-head">
        <span className="atlas-eyebrow atlas-today-title">{longDayLabel(date).toUpperCase()} • TODAY'S SESSIONS</span>
        <span
          className="atlas-today-link atlas-link"
          {...pressProps(() => goTo('/day'), 'View full day')}
        >
          VIEW FULL DAY →
        </span>
      </div>
      <div className="atlas-today-strip">
        {shown.map((s) => {
          const live = s.status === 'insession'
          return (
            <div
              key={s.id}
              className={`atlas-today-item${live ? ' atlas-today-item--live' : ''} atlas-pop`}
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
      </div>
    </section>
  )
}
