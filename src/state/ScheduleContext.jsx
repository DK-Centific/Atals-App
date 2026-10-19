import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { SESSIONS, toMinutes } from '../data/schedule.js'

// In-memory schedule shared by every view. Bookings last until the page reloads.
const ScheduleContext = createContext(null)

let nextId = 1

export function ScheduleProvider({ children }) {
  const [sessions, setSessions] = useState(SESSIONS)

  const addSession = useCallback((session) => {
    const created = { id: `new-${nextId++}`, ...session }
    setSessions((prev) => [...prev, created])
    return created
  }, [])

  const value = useMemo(() => ({ sessions, addSession }), [sessions, addSession])
  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export const useSchedule = () => useContext(ScheduleContext)

export const sessionsOn = (sessions, date) =>
  sessions
    .filter((s) => s.date === date)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))

export const overlaps = (a, b) =>
  toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end)
