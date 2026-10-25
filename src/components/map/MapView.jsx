import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TEAMS, TODAY, teamShort } from '../../data/schedule.js'
import { HQ, boxAround, formatMiles } from '../../lib/geo.js'
import { etaFrom, formatDrive, routeBetween } from '../../lib/routing.js'
import { longDayLabel } from '../../lib/dates.js'
import { prefersReducedMotion } from '../../motion/motion.js'
import usePresence from '../../motion/usePresence.js'
import useFocusTrap, { returnFocus } from '../../motion/useFocusTrap.js'
import { useToast } from '../../motion/Toast.jsx'
import { useFilteredPicks } from '../../state/FilterContext.jsx'
import { MAP_LAYERS, useMap } from '../../state/MapContext.jsx'
import { useParticipants, useQueue } from '../../state/ParticipantContext.jsx'
import { useRole } from '../../state/RoleContext.jsx'
import { useSchedule } from '../../state/ScheduleContext.jsx'
import { hasGroup } from '../../lib/filters.js'

const SOURCE = '[data-map-source]'
const OPEN_BUTTON = '.atlas-route-map-open'
const CLOSE_MS = 300 // matches .atlas-map[data-state="closing"]

// Same tiles as Twilight: MapLibre with OpenFreeMap (OpenMapTiles, OpenStreetMap data).
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
// Used when the tiles can't be reached, so the dots and routes still work.
const FALLBACK_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: 'atlas-bg', type: 'background', paint: { 'background-color': '#151719' } }],
}
const START_MILES = 1 // the map opens showing about a mile around HQ
const ROUTE_MS = 700 // line draw (spec "reveal")
const CAMERA_MS = 900

const STATUS_TEXT = { open: 'Open to book', booked: 'Booked', insession: 'In session', completed: 'Completed' }

// Clip the full-screen map down to the mini route map it grows out of.
function sourceInset() {
  const el = document.querySelector(SOURCE)
  if (!el) return 'inset(0 round 0px)'
  const r = el.getBoundingClientRect()
  const w = window.innerWidth
  const h = window.innerHeight
  return `inset(${r.top}px ${w - r.right}px ${h - r.bottom}px ${r.left}px round 16px)`
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
    const onKey = (e) => {
      // Escape closes the map unless a menu or sheet on top of it takes it first.
      if (e.key === 'Escape' && !document.querySelector('.atlas-menu, .atlas-sheet-layer')) onClose()
    }
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
      <LiveMap onClose={onClose} />
    </div>
  )
}

// Room the side panels take, so HQ and routes land in the open part of the map.
// `route` also keeps clear of the info tile on the right.
function mapPadding(route = false) {
  if (window.innerWidth < 640) return { top: 80, bottom: window.innerHeight * (route ? 0.5 : 0.48), left: 30, right: 30 }
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return { top: 8 * rem, bottom: 5 * rem, left: (route ? 33 : 27) * rem, right: (route ? 33 : 8) * rem }
}

const easeOut = (t) => 1 - (1 - t) ** 4

const lineOf = (pts) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts } })
const EMPTY_LINE = lineOf([])

function addRouteLayers(map) {
  if (map.getSource('atlas-route')) return
  map.addSource('atlas-route', { type: 'geojson', data: EMPTY_LINE })
  map.addLayer({
    id: 'atlas-route-glow',
    type: 'line',
    source: 'atlas-route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#00E5FF', 'line-width': 12, 'line-opacity': 0.22, 'line-blur': 6 },
  })
  map.addLayer({
    id: 'atlas-route-line',
    type: 'line',
    source: 'atlas-route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#00E5FF', 'line-width': 4 },
  })
  // While the road route loads: a faint dashed straight line to the destination.
  map.addSource('atlas-route-pending', { type: 'geojson', data: EMPTY_LINE })
  map.addLayer({
    id: 'atlas-route-pending',
    type: 'line',
    source: 'atlas-route-pending',
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': '#00E5FF', 'line-width': 2, 'line-opacity': 0.45, 'line-dasharray': [1, 2.5] },
  }, 'atlas-route-glow')
}

// One MapLibre map for the life of the Map view.
function useLibreMap(containerRef) {
  const [map, setMap] = useState(null)
  const [baseZoom, setBaseZoom] = useState(null)
  const [tiles, setTiles] = useState('loading') // loading | ok | offline

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const start = new maplibregl.Map({
      container: el,
      style: STYLE_URL,
      center: [HQ.lng, HQ.lat],
      zoom: 14,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      fadeDuration: prefersReducedMotion() ? 0 : 200,
    })
    start.touchZoomRotate.disableRotation()
    start.keyboard.disableRotation()

    let fellBack = false
    const fallBack = () => {
      if (fellBack || start.isStyleLoaded()) return
      fellBack = true
      setTiles('offline')
      start.setStyle(FALLBACK_STYLE)
    }
    const timer = setTimeout(fallBack, 8000)
    start.on('error', () => { if (!start.isStyleLoaded()) fallBack() })
    start.on('style.load', () => {
      clearTimeout(timer)
      if (!fellBack) setTiles('ok')
      addRouteLayers(start)
    })

    const fit = () => {
      const cam = start.cameraForBounds(boxAround(HQ, START_MILES), { padding: mapPadding() })
      if (cam) {
        start.jumpTo(cam)
        setBaseZoom(cam.zoom)
      }
    }
    fit()
    setMap(start)
    return () => { clearTimeout(timer); start.remove(); setMap(null) }
  }, [containerRef])

  return { map, baseZoom, tiles }
}

// How far out dots show: about a mile at the opening zoom, doubling with each
// zoom level out, so more of the queue appears as you zoom out.
function useRevealMiles(map, baseZoom) {
  const [miles, setMiles] = useState(START_MILES)
  useEffect(() => {
    if (!map || baseZoom == null) return undefined
    let raf = 0
    const update = () => {
      raf = 0
      setMiles(START_MILES * 2 ** (baseZoom - map.getZoom()))
    }
    const onZoom = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    map.on('zoom', onZoom)
    return () => { map.off('zoom', onZoom); cancelAnimationFrame(raf) }
  }, [map, baseZoom])
  return miles
}

// MapLibre markers whose contents React renders through portals.
function useMarkerHosts(map, items, className) {
  const hosts = useRef(new Map())
  const [, bump] = useState(0)
  useEffect(() => {
    if (!map) return
    const seen = new Set()
    let changed = false
    for (const it of items) {
      seen.add(it.id)
      const host = hosts.current.get(it.id)
      if (host) {
        host.marker.setLngLat([it.lng, it.lat])
        continue
      }
      const el = document.createElement('div')
      el.className = className
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([it.lng, it.lat]).addTo(map)
      hosts.current.set(it.id, { el, marker })
      changed = true
    }
    for (const [id, host] of hosts.current) {
      if (!seen.has(id)) { host.marker.remove(); hosts.current.delete(id); changed = true }
    }
    if (changed) bump((n) => n + 1)
  }, [map, items, className])
  useEffect(() => () => {
    for (const host of hosts.current.values()) host.marker.remove()
    hosts.current.clear()
  }, [map])
  return hosts.current
}

// Which bookings a team is heading to now: its live session, else its next one today.
function teamTarget(sessions, teamId) {
  const today = sessions.filter((s) => s.team === teamId && s.date === TODAY && s.participantId)
  return today.find((s) => s.status === 'insession')
    ?? today.filter((s) => s.status === 'booked').sort((a, b) => a.start.localeCompare(b.start))[0]
    ?? null
}

function LiveMap({ onClose }) {
  const containerRef = useRef(null)
  const { map, baseZoom, tiles } = useLibreMap(containerRef)
  const revealMiles = useRevealMiles(map, baseZoom)
  const queue = useQueue()
  const { sessions } = useSchedule()
  const { layers, focus, focusParticipant, selected, setSelected, clearFocus } = useMap()
  const picks = useFilteredPicks()
  const toast = useToast()
  // { to, label, trip: null | { miles, minutes, eta, estimated, reason } }
  const [route, setRoute] = useState(null)
  const anim = useRef(0)
  const request = useRef(null)

  // Status and team picks narrow the bookings on the map (OR inside a group,
  // AND across). People open to book have no team or booking, so only the
  // "Open to book" layer switch hides them.
  const visible = useCallback((p) => {
    if (!layers[p.status]) return false
    if (p.status === 'open') return true
    const statusPicks = picks.filter((x) => x.group === 'status').map((x) => x.value)
    const teamPicks = picks.filter((x) => x.group === 'team').map((x) => x.value)
    if (hasGroup(picks, 'status') && !statusPicks.includes(p.session.status)) return false
    if (hasGroup(picks, 'team') && !teamPicks.includes(p.session.team)) return false
    return true
  }, [layers, picks])

  const shown = useMemo(() => queue.filter(visible), [queue, visible])
  const hosts = useMarkerHosts(map, queue, 'atlas-map-pin')
  const hqItems = useMemo(() => [{ id: 'hq', lng: HQ.lng, lat: HQ.lat }], [])
  const hqHost = useMarkerHosts(map, hqItems, 'atlas-map-pin atlas-map-pin--hq')
  const routeItems = useMemo(() => (route ? [{ id: 'route', lng: route.to.lng, lat: route.to.lat }] : []), [route])
  const routeHost = useMarkerHosts(map, routeItems, 'atlas-map-pin atlas-map-pin--label')

  const fit = useCallback((coords) => {
    const lngs = coords.map((c) => c[0])
    const lats = coords.map((c) => c[1])
    // Never closer than the opening view: picking someone zooms out to fit the trip.
    map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], {
      padding: mapPadding(true),
      maxZoom: baseZoom ?? 14,
      duration: prefersReducedMotion() ? 0 : CAMERA_MS,
      easing: easeOut,
    })
  }, [map, baseZoom])

  // Draw the road route from HQ: zoom out to the trip right away with a dashed
  // placeholder, then trace the real road path (700ms) once routing answers.
  const drawRoute = useCallback((to, label) => {
    if (!map) return
    cancelAnimationFrame(anim.current)
    request.current?.abort()
    const ctrl = new AbortController()
    request.current = ctrl
    const line = map.getSource('atlas-route')
    const pending = map.getSource('atlas-route-pending')
    const straight = [[HQ.lng, HQ.lat], [to.lng, to.lat]]
    setRoute({ to, label, trip: null })
    line?.setData(EMPTY_LINE)
    pending?.setData(lineOf(straight))
    fit(straight)

    routeBetween(HQ, to, ctrl.signal).then((trip) => {
      if (ctrl.signal.aborted) return
      const eta = etaFrom(trip.minutes)
      setRoute({ to, label, trip: { ...trip, eta } })
      pending?.setData(EMPTY_LINE)
      // An estimate is drawn dashed so it never passes for a real road path.
      if (map.getLayer('atlas-route-line')) {
        map.setPaintProperty('atlas-route-line', 'line-dasharray', trip.estimated ? [2, 1.5] : undefined)
        map.setPaintProperty('atlas-route-glow', 'line-opacity', trip.estimated ? 0 : 0.22)
      }
      fit(trip.coords)
      const pts = trip.coords
      if (!line) return
      if (prefersReducedMotion()) { line.setData(lineOf(pts)); return }
      const t0 = performance.now() + 120
      const step = (now) => {
        const t = Math.min(1, Math.max(0, (now - t0) / ROUTE_MS))
        const n = Math.max(2, Math.ceil(easeOut(t) * pts.length))
        line.setData(lineOf(pts.slice(0, n)))
        if (t < 1) anim.current = requestAnimationFrame(step)
      }
      anim.current = requestAnimationFrame(step)
    }).catch(() => { /* superseded by a newer route */ })
  }, [map, fit])

  const clearRoute = useCallback(() => {
    cancelAnimationFrame(anim.current)
    request.current?.abort()
    map?.getSource('atlas-route')?.setData(EMPTY_LINE)
    map?.getSource('atlas-route-pending')?.setData(EMPTY_LINE)
    setRoute(null)
  }, [map])

  // Travel to whatever was picked: a participant, or the place a team is heading.
  useEffect(() => {
    if (!map || !focus) return
    const go = () => {
      if (focus.kind === 'participant') {
        const p = queue.find((q) => q.id === focus.id)
        if (!p) return
        drawRoute(p, p.name.toUpperCase())
        return
      }
      const team = TEAMS.find((t) => t.id === focus.id)
      const s = teamTarget(sessions, focus.id)
      const p = s && queue.find((q) => q.id === s.participantId)
      if (!p) {
        toast(`Team ${team?.short ?? focus.id} has nothing else booked today.`)
        return
      }
      setSelected(p.id)
      drawRoute(p, `TEAM ${team.short.toUpperCase()} · ${s.status === 'insession' ? 'ON SITE' : `DUE ${s.start}`}`)
    }
    if (map.isStyleLoaded()) go()
    else map.once('style.load', go)
  }, [map, focus]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { cancelAnimationFrame(anim.current); request.current?.abort() }, [])

  const recenter = () => {
    if (!map || baseZoom == null) return
    clearRoute()
    clearFocus()
    map.flyTo({ center: [HQ.lng, HQ.lat], zoom: baseZoom, duration: prefersReducedMotion() ? 0 : CAMERA_MS, essential: true })
  }
  const zoomBy = (d) => map?.easeTo({ zoom: map.getZoom() + d, duration: prefersReducedMotion() ? 0 : 300 })

  const inReach = shown.filter((p) => p.distMi <= revealMiles)
  const selectedItem = queue.find((p) => p.id === selected) ?? null

  return (
    <>
      <div ref={containerRef} className="atlas-map-canvas" aria-label="Map of participants around Centific HQ" />

      {hqHost.get('hq') && createPortal(
        <div className="atlas-map-hq" title={HQ.address}>
          <span className="atlas-map-hq-mark" aria-hidden="true" />
          <span className="atlas-map-hq-label">CENTIFIC HQ</span>
        </div>,
        hqHost.get('hq').el,
      )}
      {route && routeHost.get('route') && createPortal(
        <span key={route.label} className={`atlas-map-marker atlas-map-marker--destination${route.to.lat < HQ.lat ? ' atlas-map-marker--below' : ''}`}>
          {route.label}
          <span key={route.trip ? 'trip' : 'wait'} className="atlas-map-marker-eta atlas-status-line">
            {route.trip ? ` · ETA ${route.trip.eta} · ${formatDrive(route.trip.minutes).toUpperCase()}` : ' · ROUTING…'}
          </span>
        </span>,
        routeHost.get('route').el,
      )}

      {queue.map((p) => {
        const host = hosts.get(p.id)
        if (!host) return null
        const on = visible(p) && (p.distMi <= revealMiles || p.id === selected)
        return createPortal(
          <ParticipantDot
            participant={p}
            revealed={on}
            selected={p.id === selected}
            onPick={() => setSelected(p.id === selected ? null : p.id)}
          />,
          host.el,
        )
      })}

      <QueuePanel shown={shown} onClose={onClose} />

      {selectedItem && (
        <InfoTile
          participant={selectedItem}
          trip={route?.to.id === selectedItem.id ? route.trip ?? 'loading' : null}
          onRoute={() => focusParticipant(selectedItem.id)}
          onDismiss={() => setSelected(null)}
          onCloseMap={onClose}
        />
      )}

      <div className={`atlas-map-zoom-status${inReach.length ? ' is-on' : ''}`} role="status" aria-live="polite">
        <span key={`${inReach.length}-${shown.length}`} className="atlas-eyebrow atlas-map-zoom-status-text atlas-status-line">
          {inReach.length} OF {shown.length} IN REACH · {revealMiles < 9.5 ? `${revealMiles.toFixed(1)} MI` : `${Math.round(revealMiles)} MI`}
          {inReach.length < shown.length ? ' · ZOOM OUT FOR MORE' : ''}
        </span>
      </div>
      {tiles === 'offline' && (
        <div className="atlas-map-offline" role="status">Map tiles couldn’t load, so streets are hidden. Dots and routes still work.</div>
      )}

      <div className="atlas-map-zoom-controls">
        <button type="button" className="atlas-map-zoom-btn" aria-label="Zoom in" onClick={() => zoomBy(1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <button type="button" className="atlas-map-zoom-btn" aria-label="Zoom out" onClick={() => zoomBy(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <div className="atlas-map-zoom-gap" />
        <button type="button" className="atlas-map-zoom-btn" aria-label="Back to Centific HQ" title="Back to Centific HQ" onClick={recenter}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
        </button>
      </div>
    </>
  )
}

function ParticipantDot({ participant: p, revealed, selected, onPick }) {
  const when = p.session ? `${p.session.date === TODAY ? 'Today' : longDayLabel(p.session.date)} ${p.session.start}` : null
  return (
    <button
      type="button"
      className={`atlas-map-dot atlas-map-dot--${p.status}${revealed ? ' is-revealed' : ''}${selected ? ' is-selected' : ''}`}
      tabIndex={revealed ? 0 : -1}
      aria-hidden={!revealed}
      aria-pressed={selected}
      aria-label={`${p.name}, ${STATUS_TEXT[p.status]}${when ? `, ${when}` : ''}, ${formatMiles(p.distMi)} from HQ`}
      onClick={(e) => { e.stopPropagation(); onPick() }}
    >
      <span className="atlas-map-dot-core" />
      <span className="atlas-map-dot-label" aria-hidden="true">
        {p.name.toUpperCase()} · <span className="atlas-map-dot-status">{STATUS_TEXT[p.status].toUpperCase()}</span>
      </span>
    </button>
  )
}

// Spec section 7: the four-dot chasing glyph and a running seconds count.
function useSeconds(running, startedAt) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!running) return undefined
    const tick = () => setSecs(Math.floor((performance.now() - startedAt) / 1000))
    tick()
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  }, [running, startedAt])
  return secs
}

const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')

function SyncLine() {
  const { sync, fetchedAt, participants, total, hasData, syncNow, usingMock } = useParticipants()
  const { isAdmin } = useRole()
  const busy = sync.state === 'loading'
  const secs = useSeconds(busy, sync.startedAt)

  let text
  if (busy) text = hasData ? `Showing the ${timeOf(fetchedAt)} copy · refreshing` : 'Loading the OneForma queue'
  else if (sync.state === 'failed') text = hasData ? `Refresh failed · showing the ${timeOf(fetchedAt)} copy` : 'Couldn’t reach OneForma'
  else text = `${participants.length} endorsed of ${total} · ${timeOf(fetchedAt)}`

  return (
    <div className="atlas-queue-sync">
      <div
        className={`atlas-queue-sync-line is-${sync.state}`}
        role="status"
        aria-live="polite"
        title={sync.state === 'failed' ? sync.error : usingMock ? 'Mock OneForma data until the REST API is connected' : 'From the OneForma API'}
      >
        <span className="atlas-queue-sync-dot" aria-hidden="true" />
        <span key={text} className="atlas-queue-sync-text atlas-status-line">{text}</span>
        {usingMock && <span className="atlas-queue-mock">MOCK</span>}
      </div>
      {isAdmin && (
        <button
          type="button"
          className={`atlas-sync-btn${busy ? ' is-busy' : ''}`}
          aria-disabled={busy}
          onClick={() => { if (!busy) syncNow() }}
        >
          <span className="atlas-sync-icon" aria-hidden="true">
            <svg className="atlas-sync-icon-idle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
            <span className="atlas-sync-dots"><i /><i /><i /><i /></span>
          </span>
          {busy ? `Syncing ${secs}s` : sync.state === 'loaded' && sync.manual ? 'Sync again' : 'Sync'}
        </button>
      )}
    </div>
  )
}

// Left panel: the OneForma queue, closest to HQ first, plus team shortcuts and
// the layer switches (Completed is off until switched on).
function QueuePanel({ shown, onClose }) {
  const { layers, toggleLayer, focusTeam, focusParticipant, selected } = useMap()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = q
    ? shown.filter((p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
    : shown

  return (
    <>
      <button type="button" className="atlas-map-back atlas-map-chrome" onClick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        <span className="atlas-map-back-label">RETURN TO SCHEDULE</span>
      </button>

      <section className="atlas-queue atlas-map-chrome" aria-label="OneForma participant queue">
        <div className="atlas-queue-head">
          <div>
            <div className="atlas-eyebrow atlas-queue-eyebrow">ONEFORMA · ENDORSED</div>
            <h2 className="atlas-queue-title">Participant queue</h2>
          </div>
        </div>
        <SyncLine />

        <div className="atlas-queue-teams" role="group" aria-label="Follow a team">
          {TEAMS.map((t) => (
            <button key={t.id} type="button" className="atlas-queue-team" onClick={() => focusTeam(t.id)}>
              <span className="atlas-queue-team-code">{t.code}</span>
              {t.short}
            </button>
          ))}
        </div>

        <label className="atlas-queue-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="search"
            className="atlas-queue-search-input"
            value={query}
            placeholder="Name, address or OF id"
            aria-label="Search the queue"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <ol className="atlas-queue-list atlas-no-scrollbar">
          {rows.map((p, i) => (
            <li key={p.id} className="atlas-queue-item atlas-row-in" style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
              <button
                type="button"
                className={`atlas-queue-row${p.id === selected ? ' is-selected' : ''}`}
                aria-current={p.id === selected}
                onClick={() => focusParticipant(p.id)}
              >
                <span className={`atlas-queue-dot atlas-queue-dot--${p.status}`} aria-hidden="true" />
                <span className="atlas-queue-text">
                  <span className="atlas-queue-name">{p.name}</span>
                  <span className="atlas-queue-meta">{p.address.split(',')[0]} · {STATUS_TEXT[p.status]}</span>
                </span>
                <span className="atlas-queue-dist">{formatMiles(p.distMi)}</span>
              </button>
            </li>
          ))}
          {rows.length === 0 && <li className="atlas-empty atlas-row-in">No one in the queue matches.</li>}
        </ol>

        <div className="atlas-queue-layers" role="group" aria-label="Show on map">
          {MAP_LAYERS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`atlas-layer-toggle${layers[l.id] ? ' is-on' : ''}`}
              aria-pressed={layers[l.id]}
              onClick={() => toggleLayer(l.id)}
            >
              <span className={`atlas-queue-dot atlas-queue-dot--${l.id}`} aria-hidden="true" />
              {l.id === 'completed' ? 'Show completed' : l.label}
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

// Drive from HQ: time, distance and arrival if the team left now.
function TripPanel({ trip }) {
  const loading = trip === 'loading'
  return (
    <div className={`atlas-trip${loading ? ' is-loading' : ''}${trip.estimated ? ' is-estimated' : ''}`} role="status" aria-live="polite">
      <div className="atlas-trip-head">
        <span className="atlas-eyebrow atlas-trip-eyebrow">DRIVE FROM HQ</span>
        {!loading && (
          <span className="atlas-trip-source" title={trip.estimated ? trip.reason : 'Road route from OpenStreetMap data (OSRM). No live traffic.'}>
            {trip.estimated ? 'ESTIMATE' : 'ROAD ROUTE'}
          </span>
        )}
      </div>
      {loading ? (
        <div className="atlas-trip-wait"><span className="atlas-queue-sync-dot" aria-hidden="true" />Finding the road route…</div>
      ) : (
        <div key={`${trip.minutes}-${trip.miles}`} className="atlas-trip-grid atlas-swap-in">
          <div>
            <div className="atlas-trip-value atlas-trip-value--accent">{trip.eta}</div>
            <div className="atlas-trip-label">ETA if leaving now</div>
          </div>
          <div>
            <div className="atlas-trip-value">{formatDrive(trip.minutes)}</div>
            <div className="atlas-trip-label">drive</div>
          </div>
          <div>
            <div className="atlas-trip-value">{trip.miles.toFixed(1)} mi</div>
            <div className="atlas-trip-label">{trip.estimated ? 'approx.' : 'by road'}</div>
          </div>
        </div>
      )}
      {!loading && trip.estimated && (
        <div className="atlas-trip-note">Routing service unreachable, so this is a straight-line estimate.</div>
      )}
    </div>
  )
}

// Info and actions for the dot that was clicked.
function InfoTile({ participant: p, trip, onRoute, onDismiss, onCloseMap }) {
  const { openBooking, triggerRef, startDraft } = useSchedule()
  const { canBook } = useRole()
  const s = p.session

  return (
    <section key={p.id} className="atlas-map-info atlas-raised atlas-swap-in" aria-label={`${p.name} details`}>
      <div className="atlas-map-info-head">
        <div className="atlas-map-info-head-text">
          <div className={`atlas-eyebrow atlas-map-info-status atlas-map-info-status--${p.status}`}>
            <span className={`atlas-queue-dot atlas-queue-dot--${p.status}`} aria-hidden="true" />
            {STATUS_TEXT[p.status].toUpperCase()}
          </div>
          <h3 className="atlas-map-info-name">{p.name}</h3>
          <div className="atlas-map-info-id">{p.id} · {p.locale}</div>
        </div>
        <button type="button" className="atlas-map-info-close" aria-label="Close details" onClick={onDismiss}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="atlas-map-info-body atlas-well">
        <div className="atlas-map-info-address">{p.address}</div>
        <div className="atlas-map-info-grid">
          <div>
            <div className="atlas-eyebrow atlas-map-detail-label">FROM HQ</div>
            <div className="atlas-map-detail-value">{formatMiles(p.distMi)}</div>
          </div>
          <div className="atlas-map-detail-assigned">
            <div className="atlas-eyebrow atlas-map-detail-label">{s ? 'BOOKING' : 'ENDORSED'}</div>
            <div className="atlas-map-detail-value atlas-map-detail-value--accent">
              {s ? `${s.date === TODAY ? 'Today' : longDayLabel(s.date)} ${s.start} · Team ${teamShort(s.team)}` : p.endorsedAt}
            </div>
          </div>
        </div>
      </div>

      {trip && <TripPanel trip={trip} />}

      <div className="atlas-map-detail-actions">
        <button type="button" className="atlas-map-detail-contact" onClick={onRoute}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
          Route from HQ
        </button>
        {s ? (
          <button
            type="button"
            className="atlas-map-detail-expand"
            onClick={(e) => { triggerRef.current = e.currentTarget; openBooking(s.id) }}
          >
            View booking
          </button>
        ) : (
          <button
            type="button"
            className="atlas-map-detail-expand"
            disabled={!canBook}
            title={canBook ? undefined : 'Only Admins and Schedulers can book'}
            onClick={() => { startDraft(p.id); onCloseMap() }}
          >
            Book
          </button>
        )}
      </div>
      {(p.phone || p.email) && (
        <div className="atlas-map-info-contact">
          {p.phone && <a className="atlas-link" href={`tel:${p.phone}`}>{p.phone}</a>}
          {p.email && <a className="atlas-link" href={`mailto:${p.email}`}>{p.email}</a>}
        </div>
      )}
    </section>
  )
}

