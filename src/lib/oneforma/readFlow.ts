// The Power Automate read flow: one POST with the session token returns what the
// signed-in role may see: endorsed participants (Atlas_Participants) and bookings
// (Atlas_Bookings); a moderator gets only the sessions assigned to them, yesterday to
// tomorrow. The participant queue and the schedule both load from it; calls made
// while one is running share it.

import { getToken } from '../auth/session.ts'
import { READ_URL } from './config.ts'
import type { BookingRow, ParticipantRow } from './types.ts'

export interface ReadBody {
  syncedAt?: string
  me?: { email: string; displayName: string; role: string; shortName: string | null }
  participants?: ParticipantRow[]
  bookings?: Partial<BookingRow>[]
}

let inflight: Promise<ReadBody> | null = null

export function fetchRead(): Promise<ReadBody> {
  if (!READ_URL) return Promise.reject(new Error('No read flow set'))
  if (inflight) return inflight
  const url = READ_URL
  inflight = (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        // text/plain: the flows' HTTP trigger answers no CORS preflight, which
        // application/json would trigger; it also keeps timestamps exactly as sent.
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ schemaVersion: 1, token: getToken() }),
      })
      if (!res.ok) throw new Error(`the read flow answered ${res.status}`)
      return await res.json() as ReadBody
    } finally {
      inflight = null
    }
  })()
  return inflight
}
