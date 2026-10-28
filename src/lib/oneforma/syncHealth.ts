// Whether the OneForma feed is reaching Atlas, for the badge on the booking queue.
// Judged from the relay's own report (read flow `oneformaSync`), not from when
// Atlas last read SharePoint: a read can succeed while the relay has gone quiet.

import type { OneformaSync } from './readFlow.ts'

export type FeedHealth = 'sample' | 'live' | 'stale' | 'unconnected'

/** No contact for longer than this means the relay has stopped (heartbeat is every 15 min). */
export const STALE_AFTER_MS = 2 * 60 * 60 * 1000

export function feedHealth(sync: OneformaSync | null | undefined, usingSample: boolean, now: number): FeedHealth {
  if (usingSample) return 'sample'
  if (!sync?.lastContactAt) return 'unconnected'
  const contact = Date.parse(sync.lastContactAt)
  const errored = sync.lastErrorAt ? Date.parse(sync.lastErrorAt) > contact : false
  if (errored || !(now - contact <= STALE_AFTER_MS)) return 'stale'
  return 'live'
}

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function ago(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const mins = Math.max(0, Math.round((now - t) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`
}
