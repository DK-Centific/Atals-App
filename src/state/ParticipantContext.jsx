import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { TODAY } from '../data/schedule.js'
import { fetchParticipants, readCache, usingSample, writeCache } from '../lib/oneforma/participants.ts'
import { useToast } from '../motion/Toast.jsx'
import { useSchedule } from './ScheduleContext.jsx'

// The OneForma participant queue: active Endorsed participants, closest to HQ first.
// People OneForma removed stay known (their bookings keep their history) but are never bookable.
// Cache, then refresh (spec section 7): the last copy shows at once while a
// fresh read runs behind it; a failed refresh keeps the old copy on screen.
const ParticipantContext = createContext(null)

const STALE_MS = 60 * 1000

export function ParticipantProvider({ children }) {
  const cached = useRef(readCache()).current
  const [data, setData] = useState(cached)
  // state: loading | loaded | failed; manual: the user pressed Sync.
  const [sync, setSync] = useState({ state: 'loading', manual: false, startedAt: performance.now(), error: null })
  const toast = useToast()
  const busy = useRef(false)

  const run = useCallback(async (manual) => {
    if (busy.current) return
    busy.current = true
    setSync({ state: 'loading', manual, startedAt: performance.now(), error: null })
    try {
      const fresh = await fetchParticipants()
      writeCache(fresh)
      setData(fresh)
      setSync({ state: 'loaded', manual, error: null })
    } catch (err) {
      setSync({ state: 'failed', manual, error: err.message || 'OneForma didn’t answer' })
      // The first quiet load never shows an error; a manual sync does.
      if (manual) toast(`OneForma sync failed: ${err.message || 'no answer'}`, 'error')
    } finally {
      busy.current = false
    }
  }, [toast])

  useEffect(() => {
    const age = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity
    if (age > STALE_MS) run(false)
    else setSync({ state: 'loaded', manual: false, error: null })
  }, [cached, run])

  const syncNow = useCallback(() => run(true), [run])

  const value = useMemo(() => ({
    participants: data?.participants ?? [],
    stats: data?.stats ?? null,
    fetchedAt: data?.fetchedAt ?? null,
    hasData: Boolean(data),
    sync,
    syncNow,
    usingSample,
  }), [data, sync, syncNow])
  return <ParticipantContext.Provider value={value}>{children}</ParticipantContext.Provider>
}

export const useParticipants = () => useContext(ParticipantContext)

// Where a participant stands for booking, from their bookings:
// in session > booked (today or later) > completed > open to book.
export function bookingState(sessions, participantId) {
  const mine = sessions.filter((s) => s.participantId === participantId)
  const live = mine.find((s) => s.status === 'insession')
  if (live) return { status: 'insession', session: live }
  const next = mine
    .filter((s) => s.status === 'booked' && s.date >= TODAY)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
  if (next) return { status: 'booked', session: next }
  const done = mine.filter((s) => s.status === 'completed').sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))[0]
  if (done) return { status: 'completed', session: done }
  return { status: 'open', session: null }
}

// The queue: active participants with each one's booking state attached.
export function useQueue() {
  const { participants } = useParticipants()
  const { sessions } = useSchedule()
  return useMemo(
    () => participants.filter((p) => p.active).map((p) => ({ ...p, ...bookingState(sessions, p.id) })),
    [participants, sessions],
  )
}

// One participant by OneForma userId, including people OneForma has removed.
export function useParticipant(userId) {
  const { participants } = useParticipants()
  return useMemo(() => (userId ? participants.find((p) => p.id === userId) ?? null : null), [participants, userId])
}
