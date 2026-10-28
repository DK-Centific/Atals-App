// Builds and checks execution callback events (guide sections 5 and 8). Every
// event is a full snapshot of its node, never a patch. Retries keep the same
// eventId; a correction gets a new eventId and a higher revision.

import { OF_PROJECT_ID, RECORDING_PROVIDER, SOURCE_SYSTEM, TIMEZONE } from './config.ts'
import { nowIso, zonedIso } from './time.ts'
import type {
  CallbackEvent, CallbackEventType, NodeKind, ParticipantRef, QaResult, QaStage,
} from './types.ts'

/** The parts of an Atlas booking the events need (see src/data/schedule.js). */
export interface AtlasRecording {
  version: number
  status: 'completed' | 'failed'
  mediaRef: string
  durationSeconds: number
  reason?: string
  at: string
}

export interface AtlasQa {
  result: QaResult
  mediaVersion: number
  reason?: string
  reviewer?: string
  at: string
}

export interface AtlasSession {
  id: string
  date: string
  start: string
  end: string
  /** Email of the one moderator assigned. */
  moderator: string
  /** Round-trip miles from HQ, when known. */
  routeMiles?: number
  /** How routeMiles was found: road | location | zip | admin. */
  routeMilesSource?: string
  status: string
  name: string
  location?: string
  participantId?: string
  requestId?: string
  actualStart?: string
  actualEnd?: string
  recordings?: AtlasRecording[]
  qa?: Partial<Record<QaStage, AtlasQa>>
}

export interface EventInput {
  reason?: string
  occurredAt?: string
  /** QA events only. */
  stage?: QaStage
}

export const NODE_OF: Record<CallbackEventType, NodeKind> = {
  'booking.created': 'booking',
  'booking.rescheduled': 'booking',
  'booking.cancelled': 'booking',
  'session.started': 'session',
  'session.completed': 'session',
  'session.cancelled': 'session',
  'recording.completed': 'recording',
  'recording.failed': 'recording',
  'qa.result.updated': 'qa',
}

const REASON_REQUIRED: ReadonlySet<CallbackEventType> = new Set([
  'booking.cancelled', 'session.cancelled', 'recording.failed',
])

/** Ask for a reason in the UI wherever OneForma requires one (reschedules too: section 7 does). */
export const needsReason = (type: CallbackEventType) => REASON_REQUIRED.has(type) || type === 'booking.rescheduled'

export const sessionRef = (s: Pick<AtlasSession, 'id'>) => `atlas-ss-${s.id}`
export const bookingRef = (s: Pick<AtlasSession, 'id'>) => `atlas-bk-${s.id}`
export const recordingRef = (s: Pick<AtlasSession, 'id'>) => `atlas-rec-${s.id}`
export const moderatorRef = (email: string) => `atlas-mod-${email}`

export function entityIdFor(type: CallbackEventType, s: AtlasSession, stage?: QaStage): string {
  switch (NODE_OF[type]) {
    case 'booking': return bookingRef(s)
    case 'session': return sessionRef(s)
    case 'recording': return recordingRef(s)
    case 'qa': return `${recordingRef(s)}:${stage ?? 'onsite_check'}`
  }
}

/** The key each revision counter runs on: source + project + entity + node kind. */
export const revisionKey = (type: CallbackEventType, entityId: string) => `${NODE_OF[type]}|${entityId}`

/** A booking can only be reported once it points at a OneForma participant. */
export const isLinked = (s: AtlasSession) => Boolean(s.participantId && s.requestId)

function participants(s: AtlasSession, attendance?: ParticipantRef['attendance']): ParticipantRef[] {
  const ref: ParticipantRef = { userId: s.participantId ?? '', requestId: s.requestId ?? '' }
  return [attendance ? { ...ref, attendance } : ref]
}

const latest = (s: AtlasSession) => s.recordings?.[s.recordings.length - 1] ?? null

export function buildEvent(type: CallbackEventType, s: AtlasSession, revision: number, input: EventInput = {}): CallbackEvent {
  const entityId = entityIdFor(type, s, input.stage)
  const base = {
    schemaVersion: 1 as const,
    eventId: `${entityId}-${type.replace('.', '-')}-r${revision}`,
    sourceSystem: SOURCE_SYSTEM,
    projectId: OF_PROJECT_ID,
    externalSessionId: sessionRef(s),
    entityId,
    revision,
    occurredAt: input.occurredAt ?? nowIso(),
  }
  const reason = input.reason?.trim() || undefined

  switch (type) {
    case 'booking.created':
    case 'booking.rescheduled':
    case 'booking.cancelled':
      return {
        ...base,
        eventType: type,
        data: {
          participants: participants(s, type === 'booking.cancelled' ? 'cancelled' : undefined),
          scheduledStart: zonedIso(s.date, s.start, TIMEZONE),
          scheduledEnd: zonedIso(s.date, s.end, TIMEZONE),
          timezone: TIMEZONE,
          location: s.location?.trim() || 'Location to be confirmed',
          moderatorRefs: s.moderator ? [moderatorRef(s.moderator)] : [],
          ...(reason ? { reason } : {}),
        },
      }
    case 'session.started':
    case 'session.completed':
    case 'session.cancelled':
      return {
        ...base,
        eventType: type,
        data: {
          participants: participants(s, type === 'session.cancelled' ? 'cancelled' : 'attended'),
          ...(s.actualStart ? { actualStart: s.actualStart } : {}),
          ...(type === 'session.completed' && s.actualEnd ? { actualEnd: s.actualEnd } : {}),
          ...(reason ? { reason } : {}),
        },
      }
    case 'recording.completed':
    case 'recording.failed': {
      const rec = latest(s)
      return {
        ...base,
        eventType: type,
        data: {
          provider: RECORDING_PROVIDER,
          mediaVersion: rec?.version ?? 1,
          mediaRef: rec?.mediaRef ?? '',
          durationSeconds: rec?.durationSeconds ?? 0,
          participants: participants(s),
          ...(reason ? { reason } : {}),
        },
      }
    }
    case 'qa.result.updated': {
      const stage = input.stage ?? 'onsite_check'
      const qa = s.qa?.[stage]
      return {
        ...base,
        eventType: type,
        data: {
          recordingId: recordingRef(s),
          mediaVersion: qa?.mediaVersion ?? latest(s)?.version ?? 1,
          stage,
          result: qa?.result ?? 'pending',
          sourceResultId: `${recordingRef(s)}-${stage}-v${qa?.mediaVersion ?? 1}`,
          ...(qa?.reviewer ? { reviewerRef: qa.reviewer } : {}),
          ...(reason ? { reason } : {}),
        },
      }
    }
  }
}

/* ---------- Checks before anything is sent (section 5 limits) ---------- */

const ID = /^[A-Za-z0-9_.:@-]{1,160}$/
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/
const MAX_BYTES = 256 * 1024

/** Null when OneForma should accept the event's shape, else what is wrong. */
export function checkEvent(e: CallbackEvent): string | null {
  for (const [label, v] of [['eventId', e.eventId], ['entityId', e.entityId], ['externalSessionId', e.externalSessionId]] as const) {
    if (!ID.test(v)) return `${label} has characters OneForma doesn’t accept`
  }
  if (!e.projectId) return 'No OneForma project'
  if (!Number.isInteger(e.revision) || e.revision < 1) return 'Revision must be a positive whole number'
  if (!ISO_WITH_OFFSET.test(e.occurredAt)) return 'Time needs a timezone'
  if (NODE_OF[e.eventType] === 'session' && e.entityId !== e.externalSessionId) return 'Session entity must match its session'

  const d = e.data as unknown as Record<string, unknown>
  const people = d.participants as ParticipantRef[] | undefined
  if (people && people.some((p) => !p.userId || !p.requestId)) return 'Not linked to a OneForma participant'
  if (REASON_REQUIRED.has(e.eventType) && !String(d.reason ?? '').trim()) return 'A reason is required'

  switch (e.eventType) {
    case 'session.started':
      if (!e.data.actualStart) return 'Start time missing'
      break
    case 'session.completed':
      if (!e.data.actualStart || !e.data.actualEnd) return 'Start and end times are required'
      if (e.data.actualEnd < e.data.actualStart) return 'Session ends before it starts'
      break
    case 'recording.completed':
    case 'recording.failed':
      if (!e.data.mediaRef.trim()) return 'Media reference missing'
      if (e.data.durationSeconds < 0) return 'Duration can’t be negative'
      break
    case 'qa.result.updated':
      if ((e.data.result === 'failed' || e.data.result === 'not_required') && !e.data.reason?.trim()) return 'A reason is required'
      break
    default:
      break
  }
  if (new TextEncoder().encode(JSON.stringify(e)).length > MAX_BYTES) return 'Event is over 256 KiB'
  return null
}

/** Short, human names for the sync panel and history. */
export const EVENT_LABEL: Record<CallbackEventType, string> = {
  'booking.created': 'Booking created',
  'booking.rescheduled': 'Booking rescheduled',
  'booking.cancelled': 'Booking cancelled',
  'session.started': 'Session started',
  'session.completed': 'Session completed',
  'session.cancelled': 'Session cancelled',
  'recording.completed': 'Recording logged',
  'recording.failed': 'Recording failed',
  'qa.result.updated': 'QA result',
}

export const QA_STAGE_LABEL: Record<QaStage, string> = {
  onsite_check: 'Checklist',
  internal_qa: 'Internal QA',
  client_acceptance: 'Client acceptance',
}
