import { longDayLabel } from '../dates.js'
import type { AtlasBooking } from '../oneforma/actions.ts'
import type { FieldValues } from './types.ts'

// A booking's values for the template fields.

const clock = (hhmm: string | undefined): string => {
  const [h = Number.NaN, m = Number.NaN] = (hhmm ?? '').split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`
}

const first = (name: string): string => name.trim().replace(/^(dr|mr|mrs|ms|mx|prof)\.?\s+/i, '').split(/\s+/)[0] ?? ''

export function valuesFor(
  booking: AtlasBooking | null | undefined,
  moderatorName: (email: string) => string,
): FieldValues {
  if (!booking) return {}
  const start = clock(booking.start)
  const end = clock(booking.end)
  // A moderator we can't name (no longer listed) stays a field to fill in, never an email address.
  const named = booking.moderator ? moderatorName(booking.moderator) : ''
  const moderator = named && named !== booking.moderator ? named : ''
  return {
    participantName: booking.name,
    participantFirstName: first(booking.name),
    participantPhone: booking.phone ?? '',
    sessionDate: booking.date ? `${longDayLabel(booking.date)}, ${booking.date.slice(0, 4)}` : '',
    sessionTime: start && end ? `${start} – ${end} Pacific` : start,
    address: booking.location ?? '',
    moderatorName: moderator,
    moderatorFirstName: first(moderator),
  }
}
