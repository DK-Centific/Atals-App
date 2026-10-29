// Turns the OneForma feed into Atlas participants (guide sections 2 and 3).
// The Event Hub is shared, so every payload item is checked for the Atlas projectId.
// Delivery can repeat or arrive out of order: messageIds are de-duplicated, rows are
// upserted by projectId + userId + requestId, and an older event never overwrites a newer one.

import { milesFromHq } from '../geo.js'
import type {
  FeedEnvelope, FeedStats, Participant, ParticipantRow, ProjectUserRelation,
} from './types.ts'

export type Coords = Readonly<Record<string, { lat: number; lng: number }>>

interface Relation {
  item: ProjectUserRelation
  active: boolean
  syncTimestamp: string
}

const relationKey = (r: Pick<ProjectUserRelation, 'projectId' | 'userId' | 'requestId'>) =>
  `${r.projectId}|${r.userId}|${r.requestId}`

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
// IDs may arrive as numbers in malformed messages; only strings are trusted.
const id = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

export function emptyStats(): FeedStats {
  return { messages: 0, duplicates: 0, items: 0, otherProject: 0, stale: 0, removed: 0, malformed: 0 }
}

export function ingest(envelopes: readonly FeedEnvelope[], projectId: string, coords: Coords = {}) {
  const stats = emptyStats()
  const seen = new Set<string>()
  const relations = new Map<string, Relation>()

  for (const env of envelopes) {
    if (seen.has(env.messageId)) { stats.duplicates += 1; continue }
    seen.add(env.messageId)
    stats.messages += 1
    if (env.dataType !== 'projectUserRelation') continue

    for (const raw of env.payload as Partial<ProjectUserRelation>[]) {
      stats.items += 1
      if (String(raw.projectId) !== projectId) { stats.otherProject += 1; continue }
      const userId = id(raw.userId)
      const requestId = id(raw.requestId)
      if (!userId || !requestId || (raw.type !== 'add' && raw.type !== 'remove')) { stats.malformed += 1; continue }
      const item = { ...raw, projectId, userId, requestId } as ProjectUserRelation
      const key = relationKey(item)
      const prev = relations.get(key)
      if (prev && prev.syncTimestamp > env.syncTimestamp) { stats.stale += 1; continue }
      // A remove carries the IDs but may drop profile fields: keep what we had.
      relations.set(key, {
        item: item.type === 'remove' && prev ? { ...prev.item, type: 'remove' } : item,
        active: item.type === 'add',
        syncTimestamp: env.syncTimestamp,
      })
    }
  }

  const rows = [...relations.values()].map((r) => toParticipant({ ...r.item, active: r.active }, coords))
  stats.removed = rows.filter((p) => !p.active).length
  return { participants: byUser(rows), stats }
}

/** Rows from the Power Automate read flow (already filtered and upserted there). */
export function fromRows(rows: readonly ParticipantRow[], projectId: string): Participant[] {
  return byUser(rows
    .filter((r) => String(r.projectId) === projectId && id(r.userId) && id(r.requestId))
    .map((r) => toParticipant(r, {})))
}

function toParticipant(r: ParticipantRow, coords: Coords): Participant {
  const point = Number.isFinite(r.lat) && Number.isFinite(r.lng)
    ? { lat: r.lat as number, lng: r.lng as number }
    : coords[r.userId] ?? null
  // Verified first + last name first; OneForma's fullName is only the Tools name (often a
  // username) where it couldn't verify the split, so it is the fallback.
  const first = text(r.firstName)
  const last = text(r.lastName)
  const name = first && last ? `${first} ${last}` : text(r.fullName) ?? [first, last].filter(Boolean).join(' ')
  return {
    id: r.userId,
    userId: r.userId,
    requestId: r.requestId,
    jobId: id(r.jobId),
    projectId: r.projectId,
    name: name || `OneForma user ${r.userId.slice(-4)}`,
    email: text(r.email),
    phone: text(r.phoneNumber),
    address: text(r.address) ?? [text(r.city), text(r.state)].filter(Boolean).join(', '),
    postalCode: text(r.postalCode == null ? null : String(r.postalCode)),
    city: text(r.city),
    state: text(r.state),
    locale: text(r.locale),
    joinTime: text(r.joinTime),
    active: r.active,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    pointSource: point ? 'oneforma' : null,
    distMi: point ? milesFromHq(point) : null,
  }
}

// Bookings point at a userId. If one person has more than one recruitment request
// in the project, the active one wins; between equals, the later one.
function byUser(rows: Participant[]): Participant[] {
  const users = new Map<string, Participant>()
  for (const p of rows) {
    const had = users.get(p.userId)
    if (!had || (p.active && !had.active) || p.active === had.active) users.set(p.userId, p)
  }
  return [...users.values()].sort((a, b) => (a.distMi ?? Infinity) - (b.distMi ?? Infinity))
}
