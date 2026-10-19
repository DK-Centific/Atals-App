import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isLocked } from '../../lib/bookings.js'
import { useSchedule } from '../../state/ScheduleContext.jsx'

// Right-click menu on a booking, as in Twilight's calendar: View is always there,
// changes are hidden once a booking is completed or cancelled.
export default function BookingMenu() {
  const { menu, closeMenu, openBooking, sessions } = useSchedule()
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const session = menu && sessions.find((s) => s.id === menu.id)

  // Keep the menu inside the viewport, flipping above the cursor near the bottom edge.
  useLayoutEffect(() => {
    if (!menu || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    let left = menu.x + 4
    let top = menu.y + 4
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8
    if (top + r.height > window.innerHeight - 8) top = menu.y - r.height - 4
    setPos({ left: Math.max(8, left), top: Math.max(8, top) })
  }, [menu])

  useEffect(() => {
    if (!menu) return undefined
    ref.current?.querySelector('button')?.focus({ preventScroll: true })
    const onKey = (e) => { if (e.key === 'Escape') closeMenu() }
    const onDown = (e) => { if (!ref.current?.contains(e.target)) closeMenu() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', closeMenu, true)
    window.addEventListener('resize', closeMenu)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', closeMenu, true)
      window.removeEventListener('resize', closeMenu)
    }
  }, [menu, closeMenu])

  if (!session) return null
  const locked = isLocked(session.status)
  const items = [
    { mode: 'view', label: 'View booking' },
    ...(locked ? [] : [{ mode: 'edit', label: 'Edit booking' }]),
    ...(session.status === 'booked' ? [{ mode: 'reschedule', label: 'Reschedule' }] : []),
    ...(locked ? [] : [{ mode: 'cancel', label: 'Cancel booking', danger: true }]),
  ]

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${session.name}`}
      className={`atlas-menu atlas-raised-sm${pos ? ' is-show' : ''}`}
      style={pos ?? { left: menu.x, top: menu.y }}
    >
      <div className="atlas-eyebrow atlas-menu-title">{session.name} · {session.start}</div>
      {items.map((it) => (
        <button
          key={it.mode}
          role="menuitem"
          className={`atlas-menu-item${it.danger ? ' atlas-menu-item--danger' : ''}`}
          onClick={() => openBooking(session.id, it.mode)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
