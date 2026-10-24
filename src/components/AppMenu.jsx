import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TODAY } from '../data/schedule.js'
import { FILTER_GROUPS } from '../lib/filters.js'
import { MS } from '../motion/motion.js'
import usePresence from '../motion/usePresence.js'
import { isPicked, useFilters } from '../state/FilterContext.jsx'
import { useMap } from '../state/MapContext.jsx'
import { sessionsOn, useSchedule } from '../state/ScheduleContext.jsx'
import { StatusDot } from './StatusLegend.jsx'

// Right-click anywhere (outside a booking card, which has its own menu) opens
// this hovering menu: filters, the map layer switch and today's bookings.
// Picking a name opens the map and travels to that participant. Right-click
// again, Escape or a click elsewhere dismisses it.
const SKIP = '[data-booking-id], input, textarea, select, .atlas-menu'
const HOVER_OPEN_MS = 90

export function useAppMenuTrigger(enabled = true) {
  const { appMenu, openAppMenu, closeAppMenu } = useMap()
  const open = useRef(appMenu)
  open.current = appMenu
  useEffect(() => {
    if (!enabled) return undefined
    const onContext = (e) => {
      if (e.target.closest?.(SKIP) && !e.target.closest('.atlas-app-menu')) {
        // A booking card opens its own menu; this one steps aside.
        if (open.current) closeAppMenu()
        return
      }
      e.preventDefault()
      if (open.current) closeAppMenu()
      else openAppMenu({ x: e.clientX, y: e.clientY, key: Date.now() })
    }
    document.addEventListener('contextmenu', onContext)
    return () => document.removeEventListener('contextmenu', onContext)
  }, [enabled, openAppMenu, closeAppMenu])
}

export default function AppMenu() {
  const { appMenu, closeAppMenu, layers, toggleLayer, focusParticipant } = useMap()
  const { picks, toggle, clearAll } = useFilters()
  const { sessions } = useSchedule()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const last = useRef(appMenu)
  if (appMenu) last.current = appMenu
  const shown = last.current
  const { mounted, state, onAnimationEnd } = usePresence(Boolean(appMenu), MS.menuExit)
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const [sub, setSub] = useState(null)
  const hoverTimer = useRef(0)
  const onMap = pathname.startsWith('/day/map')

  useEffect(() => { if (appMenu) setSub(null) }, [appMenu])

  // Keep it on screen; flip left or up near the edges.
  useLayoutEffect(() => {
    if (!appMenu || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    let left = appMenu.x + 4
    let top = appMenu.y + 4
    let origin = 'top left'
    if (left + r.width > window.innerWidth - 8) { left = appMenu.x - r.width - 4; origin = 'top right' }
    if (top + r.height > window.innerHeight - 8) { top = Math.max(8, window.innerHeight - r.height - 8); origin = origin.replace('top', 'bottom') }
    setPos({ left: Math.max(8, left), top: Math.max(8, top), transformOrigin: origin })
  }, [appMenu, mounted])

  useEffect(() => {
    if (!appMenu || !mounted) return undefined
    const raf = requestAnimationFrame(() => ref.current?.querySelector('[role^="menuitem"]')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(raf)
  }, [appMenu, mounted])

  useEffect(() => {
    if (!appMenu) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (sub) setSub(null)
      else closeAppMenu()
    }
    const onDown = (e) => { if (e.button !== 2 && !ref.current?.contains(e.target)) closeAppMenu() }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', closeAppMenu)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', closeAppMenu)
    }
  }, [appMenu, sub, closeAppMenu])

  if (!mounted || !shown) return null

  const today = sessionsOn(sessions, TODAY).filter((s) => s.participantId)
  const hoverSub = (id) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setSub(id), HOVER_OPEN_MS)
  }
  const goTo = (s) => {
    closeAppMenu()
    if (!onMap) navigate('/day/map')
    focusParticipant(s.participantId)
  }

  const onKeyDown = (e) => {
    const items = [...ref.current.querySelectorAll('[role^="menuitem"]:not([disabled])')]
    const i = items.indexOf(document.activeElement)
    const go = (n) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus() }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(items.length - 1)
    else if (e.key === 'ArrowRight' && document.activeElement?.dataset.sub) {
      e.preventDefault()
      setSub(document.activeElement.dataset.sub)
      requestAnimationFrame(() => ref.current?.querySelector('.atlas-app-menu-sub [role^="menuitem"]')?.focus())
    } else if (e.key === 'ArrowLeft' && sub) {
      e.preventDefault()
      const owner = ref.current.querySelector(`[data-sub="${sub}"]`)
      setSub(null)
      owner?.focus()
    } else if (e.key === 'Tab') { e.preventDefault(); closeAppMenu() }
  }

  const SubItem = ({ id, label, count }) => (
    <button
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={sub === id}
      data-sub={id}
      className={`atlas-menu-item atlas-app-menu-parent${sub === id ? ' is-open' : ''}`}
      onPointerEnter={() => hoverSub(id)}
      onPointerLeave={() => clearTimeout(hoverTimer.current)}
      onClick={() => setSub(sub === id ? null : id)}
    >
      <span>{label}</span>
      {count ? <span className="atlas-app-menu-count">{count}</span> : null}
      <span className="atlas-app-menu-caret" aria-hidden="true">›</span>
    </button>
  )

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Atlas menu"
      className="atlas-menu atlas-app-menu atlas-raised-sm"
      data-state={pos ? state : 'measuring'}
      style={pos ?? { left: shown.x, top: shown.y }}
      onKeyDown={onKeyDown}
      onAnimationEnd={onAnimationEnd}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); closeAppMenu() }}
    >
      <div className="atlas-eyebrow atlas-menu-title">ATLAS · {onMap ? 'MAP' : 'SCHEDULE'}</div>
      <SubItem id="today" label="Today’s list" count={today.length} />
      {FILTER_GROUPS.map((g) => (
        <SubItem key={g.id} id={g.id} label={`Filter by ${g.label.toLowerCase()}`} count={picks.filter((p) => p.group === g.id).length} />
      ))}
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={layers.completed}
        className="atlas-menu-item atlas-app-menu-check"
        onPointerEnter={() => hoverSub(null)}
        onClick={() => toggleLayer('completed')}
      >
        <span className={`atlas-app-menu-box${layers.completed ? ' is-on' : ''}`} aria-hidden="true" />
        Show completed on map
      </button>
      <button
        type="button"
        role="menuitem"
        className="atlas-menu-item"
        disabled={!picks.length}
        onPointerEnter={() => hoverSub(null)}
        onClick={() => { clearAll(); closeAppMenu() }}
      >
        Clear filters
      </button>
      <div className="atlas-app-menu-sep" role="separator" />
      <button
        type="button"
        role="menuitem"
        className="atlas-menu-item"
        onPointerEnter={() => hoverSub(null)}
        onClick={() => { closeAppMenu(); navigate(onMap ? '/day' : '/day/map') }}
      >
        {onMap ? 'Back to schedule' : 'Open map'}
      </button>

      {sub && (
        <div key={sub} role="menu" aria-label={sub === 'today' ? 'Today’s list' : `Filter by ${sub}`} className="atlas-app-menu-sub atlas-raised-sm">
          {sub === 'today' && (
            <>
              <div className="atlas-eyebrow atlas-menu-title">TODAY · PICK A NAME TO MAP IT</div>
              {today.map((s) => (
                <button key={s.id} type="button" role="menuitem" className="atlas-menu-item atlas-app-menu-session" onClick={() => goTo(s)}>
                  <StatusDot status={s.status} />
                  <span className="atlas-app-menu-time">{s.start}</span>
                  <span className="atlas-app-menu-name">{s.name}</span>
                </button>
              ))}
              {today.length === 0 && <div className="atlas-app-menu-empty">Nothing booked today.</div>}
            </>
          )}
          {FILTER_GROUPS.filter((g) => g.id === sub).map((g) => g.options.map((o) => {
            const on = isPicked(picks, g.id, o.id)
            return (
              <button
                key={o.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                className="atlas-menu-item atlas-app-menu-check"
                onClick={() => toggle(g.id, o.id, 'menu')}
              >
                <span className={`atlas-app-menu-box${on ? ' is-on' : ''}`} aria-hidden="true" />
                {o.label}
              </button>
            )
          }))}
        </div>
      )}
    </div>
  )
}
