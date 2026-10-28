import { useModerators } from '../../state/ModeratorContext.jsx'
import { StatusDot } from '../StatusLegend.jsx'

// Hero card for the session currently in progress. The map is opened from the
// Map tile above it.
export default function ActiveSessionCard({ session }) {
  const { label: moderatorLabel } = useModerators()
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

        <div className="atlas-eyebrow atlas-live-card-status">
          <StatusDot status="insession" pulse />
          IN SESSION • {session.moderator ? `MODERATOR ${moderatorLabel(session.moderator).toUpperCase()}` : 'NEEDS MODERATOR'}
        </div>

        <div className="atlas-live-card-name">{session.name}</div>
        <div className="atlas-live-card-time">
          {session.start} — {session.end} {session.timezone ?? ''}
        </div>

        <div className="atlas-live-card-details">
          <div className="atlas-live-card-detail">
            <div className="atlas-eyebrow">LOCATION</div>
            <div className="atlas-live-card-value">{session.location}</div>
          </div>
          <div className="atlas-live-card-detail atlas-live-card-detail--end">
            <div className="atlas-eyebrow">PROTOCOL</div>
            <div className="atlas-live-card-value">{session.protocol || 'Standard'}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
