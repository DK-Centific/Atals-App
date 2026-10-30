import { timeRange } from '../../lib/dates.js'
import { useModerators } from '../../state/ModeratorContext.jsx'
import { useParticipant } from '../../state/ParticipantContext.jsx'
import { useSchedule } from '../../state/ScheduleContext.jsx'
import { CloseIcon } from '../Icons.jsx'
import HomeSummary from '../HomeSummary.jsx'
import { StatusDot } from '../StatusLegend.jsx'

// Hero card for an in-session booking, shown when its card in the list is clicked.
// The map is opened from the Map tile above it.
export default function ActiveSessionCard({ session, onClose }) {
  const { openBooking, triggerRef } = useSchedule()
  const { name: moderatorName } = useModerators()
  const participant = useParticipant(session?.participantId)
  if (!session) return null

  return (
    <section className="atlas-live-card atlas-raised">
      <div key={session.id} className="atlas-live-card-body atlas-well atlas-swap-in">
        <div className="atlas-live-card-arcs">
          <svg width="100%" height="100%" preserveAspectRatio="none">
            <path d="M0,0 Q150,150 400,0" fill="none" stroke="var(--accent)" strokeWidth="1" />
            <path d="M0,250 Q150,100 400,250" fill="none" stroke="var(--accent)" strokeWidth="1" />
          </svg>
        </div>

        <button type="button" className="atlas-live-card-close atlas-icon-btn" aria-label="Hide the live session card" onClick={onClose}>
          <CloseIcon />
        </button>

        <div className="atlas-live-card-status">
          <StatusDot status="insession" pulse />
          In session · {session.moderator ? `with ${moderatorName(session.moderator)}` : 'needs moderator'}
        </div>

        <div className="atlas-live-card-name">{session.name}</div>
        <div className="atlas-live-card-time">
          {timeRange(session.start, session.end)} {session.timezone ?? ''}
        </div>

        <div className="atlas-live-card-details">
          <div className="atlas-live-card-detail">
            <div className="atlas-eyebrow">LOCATION</div>
            <div className="atlas-live-card-value">{session.location}</div>
          </div>
          <div className="atlas-live-card-detail atlas-live-card-detail--end">
            <div className="atlas-eyebrow">HOME</div>
            <div className="atlas-live-card-value"><HomeSummary home={participant?.home} stacked /></div>
          </div>
        </div>

        <button
          type="button"
          className="atlas-link atlas-live-card-open"
          aria-haspopup="dialog"
          onClick={(e) => { triggerRef.current = e.currentTarget; openBooking(session.id) }}
        >
          Open booking →
        </button>
      </div>
    </section>
  )
}
