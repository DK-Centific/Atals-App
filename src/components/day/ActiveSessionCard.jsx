import { useState } from 'react'
import { teamShort } from '../../data/schedule.js'
import { StatusDot } from '../StatusLegend.jsx'

// Hero card for the session currently in progress, with its route map.
export default function ActiveSessionCard({ session, onOpenMap }) {
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
          IN SESSION • ATLAS TEAM {teamShort(session.team).toUpperCase()}
        </div>

        <RouteMap session={session} onOpenMap={onOpenMap} />

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

const ZOOM_MIN = 1
const ZOOM_MAX = 2.5

function RouteMap({ session, onOpenMap }) {
  const [zoom, setZoom] = useState(1)
  const step = (d) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + d).toFixed(2))))

  return (
    <div className="atlas-route-map-frame atlas-well-sm" data-map-source>
      <svg className="atlas-route-map" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice" style={{ transform: `scale(${zoom})` }}>
        <rect x="20" y="18" width="110" height="50" rx="6" fill="rgba(255,255,255,0.025)" />
        <rect x="270" y="120" width="110" height="70" rx="6" fill="rgba(255,255,255,0.025)" />
        <rect x="150" y="140" width="90" height="50" rx="6" fill="rgba(255,255,255,0.02)" />
        <rect x="230" y="18" width="150" height="44" rx="6" fill="rgba(16,185,129,0.06)" />
        <path d="M0 62 H400" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        <path d="M0 122 H400" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        <path d="M96 0 V210" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        <path d="M206 0 V210" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        <path d="M316 0 V210" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        <path d="M-10 188 C 90 162, 175 128, 244 96 C 282 78, 302 68, 318 58" stroke="rgba(255,255,255,0.07)" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M-10 188 C 90 162, 175 128, 244 96 C 282 78, 302 68, 318 58" stroke="var(--accent)" strokeWidth="2.5" fill="none" opacity="0.9" />
        <circle cx="60" cy="170" r="10" fill="rgba(255,255,255,0.07)" />
        <circle cx="60" cy="170" r="3.5" fill="#858992" />
        <text x="78" y="174" fontSize="9" fontFamily="Inter, sans-serif" letterSpacing="1.5" fill="#858992">
          {teamShort(session.team).toUpperCase()}
        </text>
        <circle cx="318" cy="58" r="16" fill="var(--accent)" opacity="0.12" />
        <circle cx="318" cy="58" r="16" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.5" className="atlas-pulse" />
        <circle cx="318" cy="58" r="6" fill="var(--accent)" />
        <circle cx="318" cy="58" r="2.5" fill="#151719" />
      </svg>

      <div className="atlas-route-eta">
        EN ROUTE · ETA {session.eta ?? session.start}
      </div>

      <div className="atlas-route-zoom">
        <button
          type="button"
          className="atlas-map-zoom atlas-map-zoom--in"
          aria-label="Zoom in"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => step(0.5)}
        >+</button>
        <button
          type="button"
          className="atlas-map-zoom"
          aria-label="Zoom out"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => step(-0.5)}
        >−</button>
      </div>

      <div className="atlas-route-address">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="atlas-route-address-text">{session.location}</span>
      </div>

      <button type="button" className="atlas-route-map-open" aria-haspopup="dialog" onClick={onOpenMap}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
          <path d="M8 2v16M16 6v16" />
        </svg>
        View Map
      </button>
    </div>
  )
}
