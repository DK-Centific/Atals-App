import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { SESSIONS, toMinutes } from '../data/schedule.js'
import { useToast } from '../motion/Toast.jsx'

// Schedule shared by every view, saved in this browser's localStorage so
// bookings, edits and cancellations survive a refresh. There is no backend.
const ScheduleContext = createContext(null)

// v2: bookings carry their OneForma participantId (older v1 copies are ignored).
const STORAGE_KEY = 'atlas_schedule_v2'

function loadSessions() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (saved?.version === 2 && Array.isArray(saved.sessions)) return saved.sessions
  } catch {
    // Unreadable or blocked storage: start from the seed data.
  }
  return SESSIONS
}

// Returns false when this browser refuses to store (private mode, full storage).
function saveSessions(sessions) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, sessions }))
    return true
  } catch {
    return false
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
  // Inline "Saved" note in the details panel: { id, text, undo }.
  const [note, setNote] = useState(null)
  // A participant handed to the New Booking form from elsewhere (the map): { participantId, key }.
  const [draft, setDraftState] = useState(null)
  // The card that opened the panel or menu, so focus can go back to it.
  const triggerRef = useRef(null)
  const toast = useToast()
  const warned = useRef(false)

  useEffect(() => {
    if (saveSessions(sessions) || warned.current) return
    // Say so once instead of failing silently; the app keeps working in memory.
    warned.current = true
    toast('Changes can’t be saved in this browser. They last until you close this tab.', 'error')
  }, [sessions, toast])

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

  // Undo: put back the booking exactly as it was before the change.
  const restoreSession = useCallback((snapshot) => {
    setSessions((prev) => prev.map((s) => (s.id === snapshot.id ? snapshot : s)))
  }, [])

  const removeSession = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const openBooking = useCallback((id, mode = 'view') => { setMenu(null); setPanel({ id, mode }) }, [])
  const openDay = useCallback((date) => { setMenu(null); setPanel({ date }) }, [])
  const closePanel = useCallback(() => { setPanel(null); setNote(null) }, [])
  const openMenu = useCallback((id, x, y) => setMenu({ id, x, y }), [])
  const closeMenu = useCallback(() => setMenu(null), [])

  const clearNote = useCallback(() => setNote(null), [])
  const startDraft = useCallback((participantId) => setDraftState({ participantId, key: Date.now() }), [])

  const value = useMemo(() => ({
    sessions, addSession, updateSession, rescheduleSession, cancelSession, startSession, completeSession,
    restoreSession, removeSession,
    panel, openBooking, openDay, closePanel, menu, openMenu, closeMenu,
    note, setNote, clearNote, triggerRef, draft, startDraft,
  }), [draft, startDraft, sessions, addSession, updateSession, rescheduleSession, cancelSession, startSession, completeSession,
    restoreSession, removeSession,
    panel, openBooking, openDay, closePanel, menu, openMenu, closeMenu, note, clearNote])
  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export const useSchedule = () => useContext(ScheduleContext)

// Click opens the booking's details; right-click (or Shift+F10) opens the action menu.
export function useBookingTriggers() {
  const { openBooking, openMenu, triggerRef } = useSchedule()
  return (session) => ({
    role: 'button',
    tabIndex: 0,
    'aria-haspopup': 'dialog',
    'data-booking-id': session.id,
    onClick: (e) => {
      triggerRef.current = e.currentTarget
      openBooking(session.id)
    },
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        triggerRef.current = e.currentTarget
        openBooking(session.id)
      } else if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
        e.preventDefault()
        triggerRef.current = e.currentTarget
        const r = e.currentTarget.getBoundingClientRect()
        openMenu(session.id, r.left + 16, r.top + 16)
      }
    },
    onContextMenu: (e) => {
      e.preventDefault()
      triggerRef.current = e.currentTarget
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
