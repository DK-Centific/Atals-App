import { STATUS, teamShort } from '../../data/schedule.js'
import { PinIcon } from '../Icons.jsx'
import { StatusDot } from '../StatusLegend.jsx'
import { useBookingTriggers } from '../../state/ScheduleContext.jsx'

// Status styling lives in index.css under .atlas-session-card--{status}.
const CARD_CLASS = {
  completed: 'atlas-session-card atlas-session-card--completed',
  cancelled: 'atlas-session-card atlas-session-card--cancelled',
  insession: 'atlas-session-card atlas-session-card--insession',
  booked: 'atlas-session-card atlas-session-card--booked',
}

export default function SessionCard({ session, style }) {
  const live = session.status === 'insession'
  const triggers = useBookingTriggers()

  return (
    <article className={`${CARD_CLASS[session.status]} atlas-rise`} style={style} {...triggers(session)} aria-label={`${session.name}, ${session.start} to ${session.end}`}>
      {live && <div className="atlas-session-glow" />}

      <div className="atlas-session-time">
        <div className="atlas-session-start">{session.start}</div>
        <div className="atlas-session-end">{session.end}</div>
      </div>

      <div className="atlas-session-info">
        <div className="atlas-session-status">
          <StatusDot status={session.status} pulse={live} />
          <span className="atlas-eyebrow atlas-session-status-label">{STATUS[session.status].dayLabel}</span>
        </div>
        <h3 className="atlas-session-client">{session.name}</h3>
        <div className="atlas-session-meta">
          <span className="atlas-session-location">
            <PinIcon /> {session.location}
          </span>
        </div>
      </div>

      <div className="atlas-session-team">
        <div className="atlas-eyebrow atlas-session-team-label">TEAM</div>
        <div className="atlas-session-team-badge">{teamShort(session.team)}</div>
      </div>
    </article>
  )
}
