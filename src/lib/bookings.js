// Booking rules shared by the New Booking form and the booking details panel.
// Modelled on Twilight's booking flow: completed and cancelled bookings are a
// record and can't be changed, a moderator can't be in two places at once, and
// cancelling keeps the booking on the calendar with its reason. The moderator is
// optional at booking; an Admin assigns one once the booking is ready.

import { TODAY, toMinutes } from '../data/schedule.js'
import { longDayLabel } from './dates.js'

export const isLocked = (status) => status === 'completed' || status === 'cancelled'

const TITLES = /^(dr|mr|mrs|ms|mx|prof)\.?$/i

// Display names the views need: `short` for Week events, `summary` for the Month strip.
// 'Sarah Jenkins' -> S. Jenkins / Sarah Jenkins; 'Dr. Alana Rivera' -> A. Rivera / Dr. Rivera.
export function displayNames(fullName) {
  const name = fullName.trim().replace(/\s+/g, ' ')
  const words = name.split(' ')
  const title = TITLES.test(words[0]) && words.length > 2 ? words.shift() : null
  if (words.length < 2) return { name, short: name, summary: name }
  const last = words[words.length - 1]
  return {
    name,
    short: `${words[0][0].toUpperCase()}. ${last}`,
    summary: title ? `${title} ${last}` : name,
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function checkDetails({ name, email }) {
  if (!name?.trim()) return 'Add the participant’s name.'
  if (email?.trim() && !EMAIL.test(email.trim())) return 'That email address doesn’t look right.'
  return null
}

// Matches the Week timeline (08:00 - 21:00 rows).
const DAY_START = '08:00'
const DAY_END = '22:00'

export function checkTimes({ date, start, end }) {
  if (!date || !start || !end) return 'Pick a date, start time and end time.'
  if (date < TODAY) return 'Pick today or a later date.'
  if (toMinutes(end) <= toMinutes(start)) return 'End time must be after the start time.'
  if (toMinutes(start) < toMinutes(DAY_START) || toMinutes(end) > toMinutes(DAY_END)) {
    return `Bookings run between ${DAY_START} and ${DAY_END}.`
  }
  return null
}

/** A live booking still waiting for an Admin to assign its moderator. */
export const needsModerator = (s) => !s.moderator && (s.status === 'booked' || s.status === 'insession')

// The first live booking for the same moderator that overlaps `slot` on the same day.
// An unassigned slot can't clash.
export function findConflict(sessions, slot, ignoreId) {
  if (!slot.moderator) return undefined
  return sessions.find((s) =>
    s.id !== ignoreId &&
    s.status !== 'cancelled' &&
    s.moderator === slot.moderator &&
    s.date === slot.date &&
    toMinutes(s.start) < toMinutes(slot.end) &&
    toMinutes(slot.start) < toMinutes(s.end),
  )
}

// `name` turns the moderator's email into what people call them (useModerators().name).
export const conflictMessage = (s, name) =>
  `${name(s.moderator)} already has ${s.name} ${s.start} – ${s.end} that day.`

export const slotLabel = ({ date, start, end }) => `${longDayLabel(date)} · ${start} – ${end}`
