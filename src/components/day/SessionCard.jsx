import { STATUS } from '../../data/schedule.js'
import { needsModerator } from '../../lib/bookings.js'
import { useModerators } from '../../state/ModeratorContext.jsx'
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
  const { name: moderatorName, fullName } = useModerators()
  const live = session.status === 'insession'
  const triggers = useBookingTriggers()

  return (
    <article className={`${CARD_CLASS[session.status]} atlas-row-in`} style={style} {...triggers(session)} aria-label={`${session.name}, ${session.start} to ${session.end}`}>
      {live && <div className="atlas-session-glow" />}

      <div className="atlas-session-time">
        <div className="atlas-session-start">{session.start}</div>
        <div className="atlas-session-end">{session.end}</div>
      </div>

      <div className="atlas-session-info">
        <div className="atlas-session-status">
          <StatusDot status={session.status} pulse={live} />
          <span key={session.status} className="atlas-eyebrow atlas-session-status-label atlas-status-line">{STATUS[session.status].dayLabel}</span>
        </div>
        <h3 className="atlas-session-client">{session.name}</h3>
        <div className="atlas-session-meta">
          <span className="atlas-session-location">
            <PinIcon /> {session.location}
          </span>
        </div>
      </div>

      <div className="atlas-session-moderator">
        <div className="atlas-eyebrow atlas-session-moderator-label">MODERATOR</div>
        {needsModerator(session) ? (
          <div className="atlas-session-moderator-badge atlas-needs-moderator" title="An Admin assigns the moderator">Needs moderator</div>
        ) : (
          <div className="atlas-session-moderator-badge" title={`Moderator: ${fullName(session.moderator)}`}>{moderatorName(session.moderator) || '—'}</div>
        )}
      </div>
    </article>
  )
}
