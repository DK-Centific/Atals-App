import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ACTION_LABEL, EMAIL_FOR, toBookingRow } from '../lib/oneforma/actions.ts'
import type { AtlasBooking } from '../lib/oneforma/actions.ts'
import { DRY_RUN, OF_ENV } from '../lib/oneforma/config.ts'
import {
  EVENT_LABEL, bookingRef, buildEvent, checkEvent, entityIdFor, isLinked, revisionKey,
} from '../lib/oneforma/events.ts'
import type { EventInput } from '../lib/oneforma/events.ts'
import { nowIso } from '../lib/oneforma/time.ts'
import { deliver } from '../lib/oneforma/transport.ts'
import type {
  ActionKind, ActionRequest, BookingRow, CallbackEvent, CallbackEventType, OutboxEntry, OutboxStatus,
} from '../lib/oneforma/types.ts'

// The Atlas outbox: every booking change becomes one action for the Power Automate
// "Atlas action" flow, which saves the row in SharePoint, sends the emails and
// forwards the OneForma event (only for bookings linked to a OneForma participant).
// In dry run (no action URL) actions are built, checked and kept in this browser.
// Live, each one waits out the undo window, then goes to the flow one at a time,
// oldest first, never overtaking an earlier action for the same booking.

// v2: one entry per Atlas action (v1 held bare OneForma events).
const STORAGE_KEY = 'atlas_outbox_v2'
const MAX_ENTRIES = 500
/** Longer than the 6s "Saved · Undo" note, so an undo can still withdraw it. */
const UNDO_HOLD_MS = 10000
const TICK_MS = 1500
const AUTO_RETRIES = 4

export const NEEDS_ATTENTION: ReadonlySet<OutboxStatus> = new Set(['rejected', 'failed'])
/** Not in SharePoint yet: the schedule keeps these over what the read flow returns. */
const UNSAVED: ReadonlySet<OutboxStatus> = new Set(['built', 'pending', 'sending', 'failed'])

export interface RecordOptions {
  /** The OneForma event this action carries, when the booking is linked. */
  event?: CallbackEventType
  input?: EventInput
  /** Email the participant and the session's moderator (book, reschedule, cancel). */
  notify?: boolean
  /** Overrides the action's usual name in the sync panel. */
  label?: string
}

interface SyncValue {
  entries: OutboxEntry[]
  dryRun: boolean
  env: typeof OF_ENV
  attention: number
  record: (action: ActionKind, booking: AtlasBooking, options?: RecordOptions) => OutboxEntry
  withdraw: (sessionId: string, since: string) => boolean
  retry: (key: string) => void
  unsavedRows: () => BookingRow[]
  open: boolean
  setOpen: (open: boolean) => void
}

const SyncContext = createContext<SyncValue | null>(null)

function load(): OutboxEntry[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as { entries?: OutboxEntry[] } | null
    // A reload mid-send leaves "sending": it never got an answer, so send it again.
    return (saved?.entries ?? []).map((e) => (e.status === 'sending' ? { ...e, status: 'pending' as const } : e))
  } catch {
    return []
  }
}

const sessionOf = (e: OutboxEntry) => e.sessionId

export function SyncProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<OutboxEntry[]>(load)
  const [open, setOpen] = useState(false)
  const ref = useRef(entries)
  ref.current = entries

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: entries.slice(-MAX_ENTRIES) }))
    } catch { /* storage off: the outbox lasts for this tab */ }
  }, [entries])

  const add = useCallback((entry: OutboxEntry) => {
    ref.current = [...ref.current, entry]
    setEntries(ref.current)
  }, [])

  const update = useCallback((key: string, change: Partial<OutboxEntry>) => {
    ref.current = ref.current.map((e) => (e.key === key ? { ...e, ...change } : e))
    setEntries(ref.current)
  }, [])

  // OneForma revisions only go up per entity and node kind, counting withdrawn
  // ones too, so a number is never reused with different content. The booking
  // row carries them, so another browser (or a reload from SharePoint) carries on.
  const revisionsFor = useCallback((booking: AtlasBooking) => {
    const revisions: Record<string, number> = { ...(booking.revisions ?? {}) }
    for (const e of ref.current) {
      const ev = e.request.oneforma
      if (e.sessionId !== booking.id || !ev) continue
      const key = revisionKey(ev.eventType, ev.entityId)
      revisions[key] = Math.max(revisions[key] ?? 0, ev.revision)
    }
    return revisions
  }, [])

  const record = useCallback((action: ActionKind, booking: AtlasBooking, options: RecordOptions = {}) => {
    const { event: type, input = {}, notify, label } = options
    const revisions = revisionsFor(booking)
    let event: CallbackEvent | null = null
    if (type && isLinked(booking)) {
      const key = revisionKey(type, entityIdFor(type, booking, input.stage))
      revisions[key] = (revisions[key] ?? 0) + 1
      event = buildEvent(type, booking, revisions[key], input)
    }
    const problem = event ? checkEvent(event) : null
    const template = notify ? EMAIL_FOR[action] : undefined
    const request: ActionRequest = {
      schemaVersion: 1,
      // A OneForma eventId is already unique and stable; other actions get a time-based id.
      actionId: event?.eventId ?? `${bookingRef(booking)}-${action.replace('.', '-')}-${Date.now().toString(36)}`,
      action,
      environment: OF_ENV,
      occurredAt: input.occurredAt ?? nowIso(),
      booking: toBookingRow({ ...booking, revisions }),
      notify: template ? { template, participant: Boolean(booking.email?.trim()), moderators: true } : null,
      oneforma: event,
    }
    const entry: OutboxEntry = {
      key: request.actionId,
      request,
      label: label ?? (type ? EVENT_LABEL[type] : ACTION_LABEL[action]),
      sessionId: booking.id,
      participantName: booking.name,
      status: problem ? 'rejected' : DRY_RUN ? 'built' : 'pending',
      message: problem,
      createdAt: new Date().toISOString(),
      notBefore: Date.now() + UNDO_HOLD_MS,
      sentAt: null,
      attempts: 0,
      saved: false,
      emailed: [],
      duplicate: false,
    }
    add(entry)
    return entry
  }, [add, revisionsFor])

  // Undo in Atlas: actions not yet sent are withdrawn. Returns true when one had
  // already been saved, so the caller saves the restored booking again. A OneForma
  // event that already went out stays there and is flagged for a manual fix.
  const withdraw = useCallback((sessionId: string, since: string) => {
    let sent = false
    ref.current = ref.current.map((e) => {
      if (e.sessionId !== sessionId || e.createdAt < since || e.status === 'withdrawn') return e
      if (e.status === 'built' || e.status === 'pending' || (e.status === 'rejected' && !e.saved)) {
        return { ...e, status: 'withdrawn' as const, message: 'Undone in Atlas before it was sent' }
      }
      sent = true
      return e.request.oneforma
        ? { ...e, message: 'Undone in Atlas after it was sent: correct it in OneForma Tools' }
        : e
    })
    setEntries(ref.current)
    return sent
  }, [])

  const retry = useCallback((key: string) => {
    update(key, { status: DRY_RUN ? 'built' : 'pending', notBefore: Date.now(), message: null })
  }, [update])

  // The newest unsaved row per booking, oldest booking first.
  const unsavedRows = useCallback(() => {
    const rows = new Map<string, BookingRow>()
    for (const e of ref.current) if (UNSAVED.has(e.status)) rows.set(e.sessionId, e.request.booking)
    return [...rows.values()]
  }, [])

  // Live sending: one event at a time, oldest first, per booking in order.
  const busy = useRef(false)
  useEffect(() => {
    if (DRY_RUN) return undefined
    const tick = async () => {
      if (busy.current) return
      const now = Date.now()
      const blocked = new Set<string>()
      let next: OutboxEntry | null = null
      for (const e of ref.current) {
        if (blocked.has(sessionOf(e))) continue
        if (e.status === 'pending' && e.notBefore <= now) { next = e; break }
        if (e.status === 'pending' || e.status === 'sending' || e.status === 'failed') blocked.add(sessionOf(e))
      }
      if (!next) return
      busy.current = true
      const attempts = next.attempts + 1
      update(next.key, { status: 'sending', attempts })
      const result = await deliver(next.request)
      const retryLater = result.status === 'failed' && attempts < AUTO_RETRIES
      update(next.key, {
        status: retryLater ? 'pending' : result.status,
        notBefore: retryLater ? Date.now() + 2000 * 2 ** attempts : next.notBefore,
        message: result.message,
        duplicate: result.duplicate,
        saved: next.saved || result.saved,
        emailed: result.emailed.length ? result.emailed : next.emailed,
        sentAt: result.saved ? new Date().toISOString() : next.sentAt,
      })
      busy.current = false
    }
    const id = window.setInterval(() => { void tick() }, TICK_MS)
    return () => window.clearInterval(id)
  }, [update])

  const attention = useMemo(() => entries.filter((e) => NEEDS_ATTENTION.has(e.status)).length, [entries])

  const value = useMemo<SyncValue>(() => ({
    entries, dryRun: DRY_RUN, env: OF_ENV, attention, record, withdraw, retry, unsavedRows, open, setOpen,
  }), [entries, attention, record, withdraw, retry, unsavedRows, open])

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncValue {
  const value = useContext(SyncContext)
  if (!value) throw new Error('useSync must be used inside SyncProvider')
  return value
}

/** The newest outbox entry for one booking, for its status line in the drawer. */
export function useLatestFor(sessionId: string): OutboxEntry | null {
  const { entries } = useSync()
  return useMemo(() => {
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const e = entries[i]
      if (e && e.sessionId === sessionId && e.status !== 'withdrawn') return e
    }
    return null
  }, [entries, sessionId])
}
