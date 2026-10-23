import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { STATUS, TEAMS, teamShort } from '../../data/schedule.js'
import {
  MAP_CANVAS, MAP_PENDING, MAP_POINTS, MAP_ROUTE, MAP_START_ZOOM, MAP_ZOOMS,
} from '../../data/mapSeed.js'
import usePresence from '../../motion/usePresence.js'
import useFocusTrap, { returnFocus } from '../../motion/useFocusTrap.js'
import { useSchedule } from '../../state/ScheduleContext.jsx'

const SOURCE = '[data-map-source]'
const OPEN_BUTTON = '.atlas-route-map-open'
const WHEEL_STEP = 60 // accumulated wheel delta per zoom step
const CLOSE_MS = 300 // matches .atlas-map[data-state="closing"]

// Clip the full-screen map down to the mini route map it grows out of.
function sourceInset() {
  const el = document.querySelector(SOURCE)
  if (!el) return 'inset(0 round 0px)'
  const r = el.getBoundingClientRect()
  const w = window.innerWidth
  const h = window.innerHeight
  return `inset(${r.top}px ${w - r.right}px ${h - r.bottom}px ${r.left}px round 16px)`
}

// The design's 1440 x 900 canvas, scaled to cover the window.
function useCoverScale() {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () => setScale(Math.max(window.innerWidth / MAP_CANVAS.w, window.innerHeight / MAP_CANVAS.h))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

// Full-screen live map. It expands out of the Day view's route map (450ms
// --ease-slide) and shrinks back into it on close (300ms --ease-exit).
export default function MapView({ open, onClose }) {
  const { mounted, state, onAnimationEnd } = usePresence(open, CLOSE_MS)
  const [from, setFrom] = useState('inset(0 round 0px)')
  const ref = useRef(null)

  // Measure the source just before each open and close, so the map grows from
  // (and returns to) wherever the route map sits right now.
  useLayoutEffect(() => { if (open || state === 'closing') setFrom(sourceInset()) }, [open, state])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const wasOpen = useRef(open)
  useEffect(() => {
    if (open) { wasOpen.current = true; return }
    if (wasOpen.current) { wasOpen.current = false; returnFocus(document.querySelector(OPEN_BUTTON)) }
  }, [open])

  useFocusTrap(ref, open && mounted, { autoFocus: false })
  // Start on "Return to schedule", the way out, once the map is up.
  useEffect(() => {
    if (!open || !mounted) return undefined
    const raf = requestAnimationFrame(() => ref.current?.querySelector('.atlas-map-back')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(raf)
  }, [open, mounted])

  if (!mounted) return null
  return (
    <div
      ref={ref}
      className="atlas-map"
      data-state={state}
      role="dialog"
      aria-modal="true"
      aria-label="Live map"
      style={{ '--atlas-map-from': from }}
      onAnimationEnd={onAnimationEnd}
    >
      <MapCanvas />
      <MapChrome onClose={onClose} />
    </div>
  )
}

function useMapZoom() {
  const [idx, setIdx] = useState(MAP_START_ZOOM)
  const wheel = useRef(0)
  const zoomIn = useCallback(() => setIdx((i) => Math.max(0, i - 1)), [])
  const zoomOut = useCallback(() => setIdx((i) => Math.min(MAP_ZOOMS.length - 1, i + 1)), [])
  const onWheel = useCallback((e) => {
    wheel.current += e.deltaY
    if (Math.abs(wheel.current) < WHEEL_STEP) return
    if (wheel.current > 0) zoomOut()
    else zoomIn()
    wheel.current = 0
  }, [zoomIn, zoomOut])
  return { idx, level: idx - MAP_START_ZOOM, zoomIn, zoomOut, reset: () => setIdx(MAP_START_ZOOM), onWheel }
}

function MapCanvas() {
  const { sessions } = useSchedule()
  const cover = useCoverScale()
  const zoom = useMapZoom()
  const [booked, setBooked] = useState({})
  const live = sessions.find((s) => s.status === 'insession')

  const points = MAP_POINTS.map((p) => {
    const s = p.sessionId && sessions.find((o) => o.id === p.sessionId)
    return s ? { ...p, name: s.name, time: s.start, status: s.status } : p
  }).filter((p) => p.name)

  const revealed = (p) => p.reveal <= zoom.level
  const shownPoints = points.filter(revealed)
  const shownPending = MAP_PENDING.filter(revealed)
  const pendingLeft = shownPending.filter((p) => !booked[p.id]).length
  const scheduled = shownPoints.length + shownPending.filter((p) => booked[p.id]).length

  return (
    <>
      <div className="atlas-map-canvas" onWheel={zoom.onWheel}>
        <div className="atlas-map-grid" />
        <div
          className="atlas-map-stage"
          style={{ width: MAP_CANVAS.w, height: MAP_CANVAS.h, transform: `translate(-50%, -50%) scale(${cover})` }}
        >
          <div className="atlas-map-layer" style={{ transform: `scale(${MAP_ZOOMS[zoom.idx]})` }}>
            <svg className="atlas-map-svg" viewBox={`0 0 ${MAP_CANVAS.w} ${MAP_CANVAS.h}`} aria-hidden="true">
              <g stroke="rgba(255,255,255,0.03)" strokeWidth="20" fill="none">
                <path d="M0 200 L1440 200" />
                <path d="M0 600 L1440 600" />
                <path d="M400 0 L400 900" />
                <path d="M1000 0 L1000 900" />
                <path d="M0 450 Q720 400 1440 450" />
              </g>
              <g fill="rgba(255,255,255,0.015)">
                <rect x="440" y="240" width="120" height="180" rx="8" />
                <rect x="600" y="240" width="180" height="120" rx="8" />
                <rect x="820" y="240" width="140" height="160" rx="8" />
                <rect x="440" y="460" width="200" height="100" rx="8" />
              </g>
              <path className="atlas-map-route" d={MAP_ROUTE.path} pathLength="1" />
              <circle cx={MAP_ROUTE.from.x} cy={MAP_ROUTE.from.y} r="8" fill="var(--accent)" className="atlas-map-team-dot" />
              <circle cx={MAP_ROUTE.from.x} cy={MAP_ROUTE.from.y} r="3" fill="#151719" />
              <g transform={`translate(${MAP_ROUTE.to.x}, ${MAP_ROUTE.to.y})`}>
                <path d="M0 0 L-10 -25 A 12 12 0 1 1 10 -25 Z" fill="#EF4444" opacity="0.8" />
                <circle cx="0" cy="-25" r="4" fill="white" />
              </g>
            </svg>

            <span className="atlas-map-pulse" style={{ left: MAP_ROUTE.from.x, top: MAP_ROUTE.from.y }} aria-hidden="true" />
            <span className="atlas-map-marker" style={{ left: MAP_ROUTE.from.x, top: MAP_ROUTE.from.y }}>
              {MAP_ROUTE.from.label}
            </span>
            <span className="atlas-map-marker atlas-map-marker--destination" style={{ left: MAP_ROUTE.to.x, top: MAP_ROUTE.to.y }}>
              {(live?.location ?? '742 Evergreen Terr.').toUpperCase()}
            </span>

            {points.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`atlas-map-dot atlas-map-dot--${p.status}${revealed(p) ? ' is-revealed' : ''}`}
                style={{ left: p.x, top: p.y }}
                tabIndex={revealed(p) ? 0 : -1}
                aria-hidden={!revealed(p)}
                aria-label={`${p.name}, ${p.time}, ${STATUS[p.status].label}`}
              >
                <span className="atlas-map-dot-core" />
                <span className="atlas-map-dot-label" aria-hidden="true">
                  {p.name.toUpperCase()} · {p.time} · <span className="atlas-map-dot-status">{p.status === 'insession' ? 'IN PROGRESS' : STATUS[p.status].label.toUpperCase()}</span>
                </span>
              </button>
            ))}

            {MAP_PENDING.map((p) => (
              <PendingPoint
                key={p.id}
                point={p}
                revealed={revealed(p)}
                bookedWhen={booked[p.id]}
                onBook={(when) => setBooked((b) => ({ ...b, [p.id]: when }))}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={`atlas-map-zoom-status${scheduled ? ' is-on' : ''}`} role="status" aria-live="polite">
        <span key={`${scheduled}-${pendingLeft}`} className="atlas-eyebrow atlas-map-zoom-status-text atlas-status-line">
          {scheduled
            ? `${scheduled} SCHEDULED${pendingLeft ? ` · ${pendingLeft} PENDING` : ''} IN VIEW`
            : 'ZOOM OUT FOR MORE SESSIONS'}
        </span>
      </div>
      <div className="atlas-map-zoom-controls">
        <button type="button" className="atlas-map-zoom-btn" aria-label="Zoom in" disabled={zoom.idx === 0} onClick={zoom.zoomIn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <button type="button" className="atlas-map-zoom-btn" aria-label="Zoom out" disabled={zoom.idx === MAP_ZOOMS.length - 1} onClick={zoom.zoomOut}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <div className="atlas-map-zoom-gap" />
        <button type="button" className="atlas-map-zoom-btn" aria-label="Back to the team" title="Re-centre on the team" onClick={zoom.reset}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
        </button>
      </div>
    </>
  )
}

function PendingPoint({ point: p, revealed, bookedWhen, onBook }) {
  const done = Boolean(bookedWhen)
  return (
    <div
      className={`atlas-map-dot atlas-map-dot--${done ? 'booked-now' : 'pending'}${revealed ? ' is-revealed' : ''}`}
      style={{ left: p.x, top: p.y }}
      aria-hidden={!revealed}
    >
      <button
        type="button"
        className="atlas-map-dot-core"
        tabIndex={revealed ? 0 : -1}
        aria-label={`${p.name.toLowerCase()}, ${done ? 'booked' : 'not booked yet'}, show suggested slots`}
      />
      <div className="atlas-map-suggest">
        <div className="atlas-map-suggest-head">
          <span className="atlas-map-suggest-name">{p.name}</span>
          <span key={done ? 'b' : 'p'} className={`atlas-map-chip ${done ? 'atlas-map-chip--booked' : 'atlas-map-chip--pending'} atlas-status-line`}>
            {done ? 'BOOKED' : 'PENDING'}
          </span>
        </div>
        <div key={bookedWhen ?? 'pending'} className={`atlas-eyebrow atlas-map-suggest-status atlas-status-line${done ? ' is-booked' : ''}`}>
          {done ? `BOOKED · ${bookedWhen}` : 'NOT YET BOOKED · SLOTS BY PROXIMITY'}
        </div>
        {p.slots.map((s) => {
          const picked = bookedWhen === s.when
          return (
            <div key={s.prio} className={`atlas-map-suggest-row${s.prio === 'P0' ? ' is-best' : ''}`}>
              <span className={`atlas-map-chip atlas-map-chip--${s.prio.toLowerCase()}`}>{s.prio}</span>
              <div className="atlas-map-suggest-text">
                <div className="atlas-map-suggest-range">{s.range}</div>
                <div className="atlas-map-suggest-note">{s.note}</div>
              </div>
              <button
                type="button"
                className={`atlas-map-book${picked ? ' is-booked' : ''}`}
                disabled={done}
                tabIndex={revealed ? 0 : -1}
                onClick={(e) => { e.stopPropagation(); onBook(s.when) }}
              >
                {picked ? '✓ BOOKED' : 'BOOK'}
              </button>
            </div>
          )
        })}
        <div className="atlas-map-suggest-foot">TEAMS COVER 2–3 LOCATIONS/DAY · P0 = SHORTEST TRAVEL</div>
      </div>
    </div>
  )
}

function MapChrome({ onClose }) {
  const { sessions, openBooking, triggerRef } = useSchedule()
  const [query, setQuery] = useState('742 Evergreen Terr.')
  const live = sessions.find((s) => s.status === 'insession')
  const team = live && TEAMS.find((t) => t.id === live.team)

  return (
    <>
      <button type="button" className="atlas-map-back atlas-map-chrome" onClick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        <span className="atlas-map-back-label">RETURN TO SCHEDULE</span>
      </button>

      <div className="atlas-map-search atlas-map-chrome">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          type="text"
          className="atlas-map-search-input"
          value={query}
          placeholder="Search locations..."
          aria-label="Search locations"
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="atlas-map-search-locate atlas-well-sm" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
        </span>
      </div>

      {live && (
        <section className="atlas-map-detail atlas-raised atlas-map-chrome" aria-label="Live tracking">
          <div className="atlas-map-detail-head">
            <div className="atlas-map-detail-live atlas-well-sm">
              <span className="atlas-map-detail-live-dot atlas-pulse" />
            </div>
            <div className="atlas-map-detail-eta">
              <div className="atlas-eyebrow atlas-map-detail-eyebrow">LIVE TRACKING</div>
              <div className="atlas-map-detail-eta-value">ETA {live.eta ?? live.start}</div>
            </div>
            <div className="atlas-map-detail-status">
              <div className="atlas-eyebrow">STATUS</div>
              <div className="atlas-map-detail-distance">{MAP_ROUTE.distance}</div>
            </div>
          </div>

          <div className="atlas-map-detail-body atlas-well">
            <div className="atlas-map-detail-name">{live.name}</div>
            <div className="atlas-map-detail-time">{live.start} — {live.end} {live.timezone ?? ''}</div>
            <div className="atlas-map-detail-grid">
              <div>
                <div className="atlas-eyebrow atlas-map-detail-label">PROTOCOL</div>
                <div className="atlas-map-detail-value">{live.protocol || 'Standard'}</div>
              </div>
              <div className="atlas-map-detail-assigned">
                <div className="atlas-eyebrow atlas-map-detail-label">ASSIGNED</div>
                <div className="atlas-map-detail-value atlas-map-detail-value--accent">Team {team?.short ?? teamShort(live.team)}</div>
              </div>
            </div>
          </div>

          <div className="atlas-map-detail-actions">
            {live.phone || live.email ? (
              <a className="atlas-map-detail-contact" href={live.phone ? `tel:${live.phone}` : `mailto:${live.email}`}>
                <PhoneIcon /> Contact
              </a>
            ) : (
              <button type="button" className="atlas-map-detail-contact" disabled title="No phone or email on this booking">
                <PhoneIcon /> Contact
              </button>
            )}
            <button
              type="button"
              className="atlas-map-detail-expand"
              onClick={(e) => { triggerRef.current = e.currentTarget; openBooking(live.id) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
              Expand
            </button>
          </div>
        </section>
      )}
    </>
  )
}

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
)
