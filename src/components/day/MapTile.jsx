import { useMemo } from 'react'
import { HQ, milesBetween } from '../../lib/geo.js'
import useMapQueue from '../map/useMapQueue.js'

// The way into the map from the Schedule: a small preview of HQ and the people
// the map would show right now (same filters, date range and layer switches),
// in the map's status colours, with a count line and "Open map". The whole tile
// is one button, and the map grows out of it ([data-map-source]).

const ORDER = [
  { id: 'insession', label: 'in session' },
  { id: 'booked', label: 'booked' },
  { id: 'open', label: 'open to book' },
  { id: 'completed', label: 'completed' },
]
const W = 320
const H = 120
const rad = (d) => (d * Math.PI) / 180

// A map point (the participant's own, or their ZIP centre, see ParticipantContext).
const pointOf = (p) => (p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null)

export default function MapTile({ onOpen }) {
  const { shown } = useMapQueue()

  const { dots, reach, counts } = useMemo(() => {
    const placed = shown.map((p) => ({ p, at: pointOf(p) })).filter((d) => d.at)
    // Fit most people (85th percentile), not the farthest one; the few beyond
    // sit on the edge in their direction.
    const dists = placed.map((d) => milesBetween(HQ, d.at)).sort((a, b) => a - b)
    const far = Math.max(1, dists[Math.floor((dists.length - 1) * 0.85)] ?? 1)
    const reachMi = Math.ceil(far)
    const edge = H / 2 - 8
    const scale = edge / reachMi // px per mile, fits the tile's height
    const kx = 69 * Math.cos(rad(HQ.lat))
    const limit = edge * 1.25
    const c = {}
    for (const p of shown) c[p.status] = (c[p.status] ?? 0) + 1
    return {
      reach: reachMi,
      counts: c,
      dots: placed
        .map(({ p, at }) => {
          let dx = (at.lng - HQ.lng) * kx * scale
          let dy = -(at.lat - HQ.lat) * 69 * scale
          const r = Math.hypot(dx, dy)
          if (r > limit) { dx *= limit / r; dy *= limit / r }
          return { id: p.id, status: p.status, x: W / 2 + dx, y: H / 2 + dy }
        })
        // Live and booked people draw on top of the open ones.
        .sort((a, b) => ORDER.findIndex((o) => o.id === b.status) - ORDER.findIndex((o) => o.id === a.status)),
    }
  }, [shown])

  const parts = ORDER.filter((o) => counts[o.id]).map((o) => ({ ...o, n: counts[o.id] }))
  const summary = parts.length ? parts.map((o) => `${o.n} ${o.label}`).join(' · ') : 'No one matches the filters'
  const unplaced = shown.length - dots.length

  return (
    <button
      type="button"
      className="atlas-map-tile atlas-raised"
      data-tour="map-tile"
      data-map-source
      aria-haspopup="dialog"
      aria-label={`Open map. ${summary}.`}
      onClick={onOpen}
    >
      <span className="atlas-map-tile-head">
        <span className="atlas-map-tile-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
            <path d="M8 2v16M16 6v16" />
          </svg>
          Map
        </span>
        <span className="atlas-map-tile-open">
          Open map
          <svg className="atlas-map-tile-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </span>

      <span className="atlas-map-tile-preview atlas-well-sm" aria-hidden="true">
        <svg className="atlas-map-tile-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
          <circle className="atlas-map-tile-ring" cx={W / 2} cy={H / 2} r={(H / 2 - 8) / 2} />
          <circle className="atlas-map-tile-ring" cx={W / 2} cy={H / 2} r={H / 2 - 8} />
          {dots.map((d) => (
            <circle key={d.id} className={`atlas-map-tile-dot atlas-map-tile-dot--${d.status}`} cx={d.x} cy={d.y} r={d.status === 'insession' ? 4.5 : 3.5} />
          ))}
          <circle className="atlas-map-tile-hq-halo" cx={W / 2} cy={H / 2} r="9" />
        </svg>
        <span className="atlas-map-tile-hq" />
        <span className="atlas-map-tile-scale">{reach} mi</span>
        {unplaced > 0 && <span className="atlas-map-tile-note">{unplaced} without a map point</span>}
      </span>

      <span className="atlas-map-tile-summary">
        {parts.length ? parts.map((o) => (
          <span key={o.id} className="atlas-map-tile-count">
            <span className={`atlas-status-dot atlas-status-dot--${o.id}`} />
            <strong>{o.n}</strong> {o.label}
          </span>
        )) : <span className="atlas-map-tile-count">{summary}</span>}
      </span>
    </button>
  )
}
