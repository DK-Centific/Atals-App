// "Book nearby next" on the map: from a booked place (the anchor), the closest
// people still open to book, a time right after the anchor with the same
// moderator, and the miles that saves. Straight-line estimates only, so it never
// fires a burst of routing calls; the real road route is drawn only on request.

import { TODAY, toMinutes } from '../data/schedule.js'
import {
  DAY_END, MAX_SESSIONS_PER_MODERATOR_PER_DAY, SESSION_MINUTES, findConflict, moderatorDayCounts,
} from './bookings.js'
import { HQ } from './geo.js'
import { estimate } from './routing.js'

export const NEARBY_COUNT = 5
export const NEARBY_MILES = 10

const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const nextQuarter = (m) => Math.ceil(m / 15) * 15

/** The 5 closest open people to `anchor` within 10 mi, else the 5 closest. Each: { participant, miles, minutes }. */
export function nearbyTo(anchor, people) {
  const ranked = people
    .filter((p) => p.lat != null && p.lng != null && p.id !== anchor.id)
    .map((p) => ({ participant: p, ...estimate(anchor, p) }))
    .sort((a, b) => a.miles - b.miles)
  const close = ranked.filter((r) => r.miles <= NEARBY_MILES)
  return (close.length ? close : ranked).slice(0, NEARBY_COUNT)
}

/**
 * A time right after the anchor booking: its end plus the drive, rounded up to the
 * next 15 minutes, skipping times its moderator is busy, inside booking hours.
 * Same moderator unless they're at the daily limit; then no moderator (null means
 * no time fits that day). Returns { date, start, end, moderator, full }.
 */
export function nextSlot(anchorSession, driveMinutes, sessions) {
  const { date, moderator } = anchorSession
  if (date < TODAY) return null
  const full = Boolean(moderator) && (moderatorDayCounts(sessions, date).get(moderator) ?? 0) >= MAX_SESSIONS_PER_MODERATOR_PER_DAY
  const who = full ? '' : moderator ?? ''
  let start = nextQuarter(toMinutes(anchorSession.end) + driveMinutes)
  for (let tries = 0; tries < 12; tries += 1) {
    const end = start + SESSION_MINUTES
    if (end > toMinutes(DAY_END)) return null
    const slot = { date, start: hhmm(start), end: hhmm(end), moderator: who }
    const clash = findConflict(sessions, slot)
    if (!clash) return { ...slot, full }
    start = nextQuarter(toMinutes(clash.end) + driveMinutes)
  }
  return null
}

/**
 * Road miles saved by going anchor -> next -> HQ instead of two trips from HQ
 * (anchor -> HQ, then HQ -> next -> HQ). An estimate, never below 0.
 */
export function milesSaved(anchor, next) {
  const fromHq = estimate(HQ, next).miles
  const back = estimate(anchor, HQ).miles
  return Math.max(0, back + fromHq - estimate(anchor, next).miles)
}
