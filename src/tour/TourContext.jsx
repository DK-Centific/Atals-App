import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useRole } from '../state/RoleContext.jsx'
import { sectionOf, stepsFor } from './steps.js'

// The app tour: which tour is running, and which tours this person has seen.
// The first sign-in shows "welcome", then the page's own tour; every other area
// shows its tour the first time it's opened. Seen tours are remembered per
// browser, by email and role, so a new role gets its own tours.
const TourContext = createContext(null)

const KEY = 'atlas_tour_v1'
const AUTO_DELAY = 700 // let the page settle in before the tour starts

function readSeen(who) {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '{}')[who] ?? []) } catch { return new Set() }
}
function writeSeen(who, seen) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    all[who] = [...seen]
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* not remembered: the tour may show again next time */ }
}

export function TourProvider({ children }) {
  const { email, role } = useRole()
  const { pathname } = useLocation()
  const section = sectionOf(pathname)
  const who = `${email ?? ''}|${role ?? ''}`
  const [seen, setSeen] = useState(() => readSeen(who))
  // run: { id, steps, then } or null; `then` is the tour to chain after this one.
  const [run, setRun] = useState(null)
  useEffect(() => { setSeen(readSeen(who)); setRun(null) }, [who])

  const has = useCallback((id) => stepsFor(id, role).length > 0, [role])
  const markSeen = useCallback((ids) => {
    setSeen((s) => {
      const next = new Set(s)
      ids.forEach((id) => next.add(id))
      writeSeen(who, next)
      return next
    })
  }, [who])

  const start = useCallback((id, then = null) => {
    if (!has(id)) { if (then && has(then)) setRun({ id: then, steps: stepsFor(then, role), then: null }); return }
    setRun({ id, steps: stepsFor(id, role), then: then && has(then) ? then : null })
  }, [has, role])

  // Done: on to the chained tour, if any. Skip: stop here, and don't show
  // the chained one either (it waits for the next visit).
  const finish = useCallback(() => {
    setRun((r) => {
      if (!r) return null
      markSeen([r.id])
      return r.then ? { id: r.then, steps: stepsFor(r.then, role), then: null } : null
    })
  }, [markSeen, role])
  const skip = useCallback(() => {
    setRun((r) => {
      if (r) markSeen([r.id, ...(r.then ? [r.then] : [])])
      return null
    })
  }, [markSeen])

  // Moving to another area stops a running tour without counting it as seen.
  const lastSection = useRef(section)
  useEffect(() => {
    if (lastSection.current === section) return
    lastSection.current = section
    setRun(null)
  }, [section])

  // Auto-start: welcome first (then this page), or this page's tour on a first visit.
  useEffect(() => {
    if (run || !role) return undefined
    const welcome = !seen.has('welcome')
    const page = section && !seen.has(section) && has(section) ? section : null
    if (!welcome && !page) return undefined
    const t = setInterval(() => {
      // Wait while a booking or another dialog is open (the map is a page of its own).
      if (document.querySelector('[role="dialog"]:not(.atlas-map)')) return
      clearInterval(t)
      if (welcome) start('welcome', page)
      else start(page)
    }, AUTO_DELAY)
    return () => clearInterval(t)
  }, [run, role, section, seen, has, start])

  const value = useMemo(() => ({
    run,
    finish,
    skip,
    /** Replay this page's tour. */
    replayPage: () => section && has(section) && start(section),
    /** The full tour: welcome, then this page. */
    replayAll: () => start('welcome', section),
    canReplayPage: Boolean(section && has(section)),
  }), [run, finish, skip, section, has, start])

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export const useTour = () => useContext(TourContext)
