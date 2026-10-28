// Sends one Atlas action to the Power Automate "Atlas action" flow. The flow saves
// the booking row, sends the emails, adds the callback token and User-Agent, posts
// the OneForma event and answers with what it did. Nothing here holds a credential.

import { getToken } from '../auth/session.ts'
import { ACTION_URL } from './config.ts'
import type { ActionReply, ActionRequest, EmailRecipient, EmailedItem, OutboxStatus, RelayReply } from './types.ts'

const TIMEOUT_MS = 20000
const RECEIPTS = new Set(['APPLIED', 'WAITING_REFERENCE', 'IGNORED_STALE'])

type Emailed = EmailRecipient[]

export interface Delivery {
  status: OutboxStatus
  message: string | null
  duplicate: boolean
  saved: boolean
  emailed: Emailed
}

// How OneForma's answer maps onto the outbox (guide section 5, receipts and recovery).
export function classify(reply: RelayReply): Pick<Delivery, 'status' | 'message' | 'duplicate'> {
  const duplicate = Boolean(reply.duplicate)
  const message = reply.message ?? null
  if (reply.httpStatus >= 200 && reply.httpStatus < 300) {
    const status = RECEIPTS.has(String(reply.status)) ? reply.status as OutboxStatus : 'APPLIED'
    return { status, message, duplicate }
  }
  if (!reply.httpStatus || reply.httpStatus === 429 || reply.httpStatus >= 500) {
    return { status: 'failed', message: message ?? 'Saved, but OneForma didn’t answer. Sending again resends only the OneForma part.', duplicate }
  }
  const why: Record<number, string> = {
    401: 'Saved. OneForma refused the token: check the environment and credential in the action flow',
    409: 'Saved. OneForma already has a different event with this eventId or revision',
    413: 'Saved. OneForma said the event is too large',
    422: 'Saved. OneForma rejected the content, or the participant isn’t active in the project',
  }
  return { status: 'rejected', message: message ?? why[reply.httpStatus] ?? `Saved. OneForma answered ${reply.httpStatus}`, duplicate }
}

const NOT_SENT = new Set(['failed', 'error', 'skipped', 'not_sent', 'not sent', 'rejected'])

/** Who was emailed, from either reply form: ["participant"] or [{ to, status, message }]. */
export function readEmailed(list: unknown): Emailed {
  if (!Array.isArray(list)) return []
  const who = list.flatMap((item: string | EmailedItem) => {
    if (typeof item === 'string') return [item]
    if (item && typeof item === 'object' && typeof item.to === 'string') {
      return NOT_SENT.has(String(item.status ?? '').toLowerCase()) ? [] : [item.to]
    }
    return []
  })
  return [...new Set(who.map((w) => (w === 'moderators' ? 'moderator' : w)))]
    .filter((w): w is EmailRecipient => w === 'participant' || w === 'moderator')
}

/** The flow's whole answer: was it saved, who was emailed, and OneForma's receipt. */
export function readReply(httpStatus: number, reply: Partial<ActionReply> | null, request: ActionRequest): Delivery {
  const emailed = readEmailed(reply?.emailed)
  const message = reply?.message ?? null
  if (httpStatus === 429 || httpStatus >= 500 || (httpStatus < 300 && reply?.saved === false)) {
    return { status: 'failed', message: message ?? `Not saved yet: the flow answered ${httpStatus}`, duplicate: false, saved: false, emailed }
  }
  if (httpStatus === 401) {
    return { status: 'failed', message: message ?? 'Not saved: your sign-in ran out. Sign in again and it sends.', duplicate: false, saved: false, emailed }
  }
  if (httpStatus >= 300) {
    return { status: 'rejected', message: message ?? `The flow refused this (${httpStatus})`, duplicate: false, saved: false, emailed }
  }
  const duplicate = Boolean(reply?.duplicate)
  if (!request.oneforma) return { status: 'saved', message, duplicate, saved: true, emailed }
  if (!reply?.oneforma) {
    return { status: 'failed', message: 'Saved, but the flow didn’t say what OneForma answered', duplicate, saved: true, emailed }
  }
  const of = classify(reply.oneforma)
  return { ...of, message: of.message ?? message, duplicate: duplicate || of.duplicate, saved: true, emailed }
}

export async function deliver(request: ActionRequest): Promise<Delivery> {
  if (!ACTION_URL) return { status: 'built', message: null, duplicate: false, saved: false, emailed: [] }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ACTION_URL, {
      method: 'POST',
      // text/plain: the flows' HTTP trigger answers no CORS preflight, which
      // application/json would trigger; it also keeps timestamps exactly as sent.
      headers: { 'Content-Type': 'text/plain' },
      // The token rides with the request at send time; it is never stored in the outbox.
      body: JSON.stringify({ ...request, token: getToken() }),
      signal: ctrl.signal,
    })
    let reply: Partial<ActionReply> | null = null
    try { reply = await res.json() as Partial<ActionReply> } catch { /* no body: go by the status */ }
    return readReply(res.status, reply, request)
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'AbortError'
    return {
      status: 'failed',
      message: timedOut ? 'The action flow didn’t answer in time' : 'Couldn’t reach the action flow',
      duplicate: false,
      saved: false,
      emailed: [],
    }
  } finally {
    clearTimeout(timer)
  }
}
