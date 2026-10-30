import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { TODAY } from '../data/schedule.js'
import { milesFromHq } from '../lib/geo.js'
import { OF_ENV, OF_PROJECT_ID } from '../lib/oneforma/config.ts'
import { fetchParticipants, readCache, usingSample, writeCache } from '../lib/oneforma/participants.ts'
import { nowIso } from '../lib/oneforma/time.ts'
import { deliverCorrection } from '../lib/oneforma/transport.ts'
import { loadZipPoints, zipPoint } from '../lib/zipPoints.js'
import { useToast } from '../motion/Toast.jsx'
import { useSchedule } from './ScheduleContext.jsx'

// The OneForma participant queue: active Endorsed participants, closest to HQ first.
// People OneForma removed stay known (their bookings keep their history) but are never bookable.
// Cache, then refresh (spec section 7): the last copy shows at once while a
// fresh read runs behind it; a failed refresh keeps the old copy on screen.
const ParticipantContext = createContext(null)

const STALE_MS = 60 * 1000

// An address fix applied in this browser while it saves (and in dry runs).
// null address and ZIP = back to OneForma's address.
function applyFix(p, fix) {
  const of = p.corrected ? { address: p.corrected.ofAddress, postalCode: p.corrected.ofPostalCode } : { address: p.address, postalCode: p.postalCode }
  if (!fix.address && !fix.postalCode) return { ...p, ...of, corrected: null }
  return {
    ...p,
    address: fix.address ?? of.address,
    postalCode: fix.postalCode ?? (fix.address ? null : of.postalCode),
    corrected: { by: fix.by, at: fix.at, ofAddress: of.address, ofPostalCode: of.postalCode },
    lat: null,
    lng: null,
    pointSource: null,
    distMi: null,
  }
}

// People with an address but no map point get their ZIP centre, so they show on
// the map and sort by distance (marked as an estimate).
function placeByZip(list) {
  const placed = list.map((p) => {
    if (p.lat != null && p.lng != null) return p
    const c = zipPoint(p)
    return c ? { ...p, lat: c.lat, lng: c.lng, pointSource: 'zip', distMi: milesFromHq(c) } : p
  })
  return placed.sort((a, b) => (a.distMi ?? Infinity) - (b.distMi ?? Infinity))
}

// The range from HQ, remembered per browser ('any' for Any distance).
const RANGE_KEY = 'atlas_range_v1'
function readRange() {
  try {
    const v = localStorage.getItem(RANGE_KEY)
    if (v === 'any') return null
    return v && RANGE_OPTIONS.includes(Number(v)) ? Number(v) : QUEUE_RADIUS_MI
  } catch { return QUEUE_RADIUS_MI }
}

export function ParticipantProvider({ children }) {
  const [rangeMi, setRange] = useState(readRange)
  const setRangeMi = useCallback((mi) => {
    setRange(mi)
    try { localStorage.setItem(RANGE_KEY, mi == null ? 'any' : String(mi)) } catch { /* not remembered */ }
  }, [])
  const cached = useRef(readCache()).current
  const [data, setData] = useState(cached)
  const [fixes, setFixes] = useState({})
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
      // The read now carries any saved fix, so this browser's copies can go.
      setFixes((f) => (Object.keys(f).length ? {} : f))
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

  const [zipReady, setZipReady] = useState(false)
  useEffect(() => { loadZipPoints().then(setZipReady) }, [])
  const participants = useMemo(() => {
    const list = (data?.participants ?? []).map((p) => (fixes[p.id] ? applyFix(p, fixes[p.id]) : p))
    return zipReady ? placeByZip(list) : list
  }, [data, fixes, zipReady])

  // Correct a participant's address (Admin, Scheduler). The fix is saved in Atlas and
  // wins over every later OneForma pull; empty address and ZIP go back to OneForma's.
  const correctAddress = useCallback(async (p, { address, postalCode }, by) => {
    const fix = { address: address?.trim() || null, postalCode: postalCode?.trim() || null, by, at: nowIso() }
    setFixes((f) => ({ ...f, [p.id]: fix }))
    const result = await deliverCorrection({
      schemaVersion: 1,
      actionId: `atlas-pt-${p.id}-${Date.now().toString(36)}`,
      action: 'participant.corrected',
      environment: OF_ENV,
      occurredAt: fix.at,
      participant: { projectId: OF_PROJECT_ID, userId: p.userId, requestId: p.requestId, address: fix.address, postalCode: fix.postalCode },
    })
    if (!result.ok) {
      setFixes((f) => { const { [p.id]: _, ...rest } = f; return rest })
      return result
    }
    if (result.sent) run(false)
    return result
  }, [run])

  const value = useMemo(() => ({
    participants,
    correctAddress,
    stats: data?.stats ?? null,
    fetchedAt: data?.fetchedAt ?? null,
    oneformaSync: data?.oneformaSync ?? null,
    hasData: Boolean(data),
    sync,
    syncNow,
    usingSample,
    rangeMi,
    setRangeMi,
  }), [data, participants, sync, syncNow, correctAddress, rangeMi, setRangeMi])
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
// Bookable means open people within the chosen range from HQ (by their map point
// or ZIP centre). Anyone already booked stays, wherever they are.
// QUEUE_RADIUS_MI is the default range, and the fixed Seattle area the tracker counts.
export const QUEUE_RADIUS_MI = 40

export const inArea = (p) => p.distMi != null && p.distMi <= QUEUE_RADIUS_MI

// The range choices, in miles; null is Any distance, which also lists people with
// no map point yet, so a wrong address can be found and corrected.
export const RANGE_OPTIONS = [10, 20, 40, 60, 100, null]
export const withinRange = (p, mi) => mi == null || (p.distMi != null && p.distMi <= mi)
export const rangeText = (mi) => (mi == null ? 'at any distance' : `within ${mi} mi`)

// rangeMi: leave it out for the shared range, or pass a number (or null for any).
export function useQueue({ rangeMi } = {}) {
  const { participants, rangeMi: shared } = useParticipants()
  const { sessions } = useSchedule()
  const mi = rangeMi === undefined ? shared : rangeMi
  return useMemo(
    () => participants
      .filter((p) => p.active)
      .map((p) => ({ ...p, ...bookingState(sessions, p.id) }))
      .filter((p) => p.status !== 'open' || withinRange(p, mi)),
    [participants, sessions, mi],
  )
}

// One participant by OneForma userId, including people OneForma has removed.
export function useParticipant(userId) {
  const { participants } = useParticipants()
  return useMemo(() => (userId ? participants.find((p) => p.id === userId) ?? null : null), [participants, userId])
}
