import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SESSIONS, toMinutes } from '../data/schedule.js'

// Schedule shared by every view, saved in this browser's localStorage so
// bookings, edits and cancellations survive a refresh. There is no backend.
const ScheduleContext = createContext(null)

const STORAGE_KEY = 'atlas_schedule_v1'

function loadSessions() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (saved?.version === 1 && Array.isArray(saved.sessions)) return saved.sessions
  } catch {
    // Unreadable or blocked storage: start from the seed data.
  }
  return SESSIONS
}

function saveSessions(sessions) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, sessions }))
  } catch {
    // Private mode or full storage: keep working in memory.
  }
}

const newId = () => `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const stamp = (type, text) => ({ at: new Date().toISOString(), type, text })

export function ScheduleProvider({ children }) {
  const [sessions, setSessions] = useState(loadSessions)
  // Which booking the details panel shows: { id, mode } or { date } for a day's list.
  const [panel, setPanel] = useState(null)
  // Right-click menu on a booking: { id, x, y }.
  const [menu, setMenu] = useState(null)

  useEffect(() => saveSessions(sessions), [sessions])

  const patch = useCallback((id, change, entry) => {
    setSessions((prev) => prev.map((s) => (s.id === id
      ? { ...s, ...change, history: [...(s.history ?? []), entry] }
      : s)))
  }, [])

  const addSession = useCallback((session) => {
    const created = { id: newId(), ...session, history: [stamp('created', 'Booked')] }
    setSessions((prev) => [...prev, created])
    return created
  }, [])

  const updateSession = useCallback((id, change) => {
    patch(id, change, stamp('edited', 'Details edited'))
  }, [patch])

  const rescheduleSession = useCallback((id, slot, reason) => {
    setSessions((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const from = { date: s.date, start: s.start, end: s.end }
      return {
        ...s,
        ...slot,
        rescheduledFrom: from,
        history: [...(s.history ?? []), { ...stamp('rescheduled', 'Rescheduled'), from, to: slot, reason }],
      }
    }))
  }, [])

  const cancelSession = useCallback((id, reason) => {
    patch(id, { status: 'cancelled', cancelReason: reason, cancelledAt: new Date().toISOString() },
      { ...stamp('cancelled', 'Cancelled'), reason })
  }, [patch])

  const startSession = useCallback((id) => {
    patch(id, { status: 'insession' }, stamp('started', 'Session started'))
  }, [patch])

  const completeSession = useCallback((id) => {
    patch(id, { status: 'completed' }, stamp('completed', 'Marked completed'))
  }, [patch])

  const openBooking = useCallback((id, mode = 'view') => { setMenu(null); setPanel({ id, mode }) }, [])
  const openDay = useCallback((date) => { setMenu(null); setPanel({ date }) }, [])
  const closePanel = useCallback(() => setPanel(null), [])
  const openMenu = useCallback((id, x, y) => setMenu({ id, x, y }), [])
  const closeMenu = useCallback(() => setMenu(null), [])

  const value = useMemo(() => ({
    sessions, addSession, updateSession, rescheduleSession, cancelSession, startSession, completeSession,
    panel, openBooking, openDay, closePanel, menu, openMenu, closeMenu,
  }), [sessions, addSession, updateSession, rescheduleSession, cancelSession, startSession, completeSession,
    panel, openBooking, openDay, closePanel, menu, openMenu, closeMenu])
  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export const useSchedule = () => useContext(ScheduleContext)

// Click opens the booking's details; right-click (or Shift+F10) opens the action menu.
export function useBookingTriggers() {
  const { openBooking, openMenu } = useSchedule()
  return (session) => ({
    role: 'button',
    tabIndex: 0,
    'aria-haspopup': 'dialog',
    'data-booking-id': session.id,
    onClick: () => openBooking(session.id),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openBooking(session.id)
      } else if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
        e.preventDefault()
        const r = e.currentTarget.getBoundingClientRect()
        openMenu(session.id, r.left + 16, r.top + 16)
      }
    },
    onContextMenu: (e) => {
      e.preventDefault()
      openMenu(session.id, e.clientX, e.clientY)
    },
  })
}

export const sessionsOn = (sessions, date) =>
  sessions
    .filter((s) => s.date === date)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))

export const overlaps = (a, b) =>
  toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end)
