// Words and tones for outbox states, shared by the booking drawer and the sync panel.

import type { EmailRecipient, EmailTemplate, OutboxEntry, OutboxStatus } from './types.ts'

export type Tone = 'ok' | 'wait' | 'warn' | 'bad' | 'muted'

export const OUTBOX_TEXT: Record<OutboxStatus, string> = {
  built: 'Dry run, not sent',
  pending: 'Queued',
  sending: 'Saving',
  saved: 'Saved',
  APPLIED: 'Saved · Applied in OneForma',
  WAITING_REFERENCE: 'Saved · Waiting on OneForma',
  IGNORED_STALE: 'Saved · Older than OneForma’s copy',
  rejected: 'Rejected',
  failed: 'Not sent yet',
  withdrawn: 'Withdrawn',
}

export const OUTBOX_TONE: Record<OutboxStatus, Tone> = {
  built: 'ok',
  pending: 'wait',
  sending: 'wait',
  saved: 'ok',
  APPLIED: 'ok',
  WAITING_REFERENCE: 'wait',
  IGNORED_STALE: 'warn',
  rejected: 'bad',
  failed: 'bad',
  withdrawn: 'muted',
}

/** Lookup map so classes are never composed from strings at runtime. */
export const TONE_CLASS: Record<Tone, string> = {
  ok: 'atlas-of-tone atlas-of-tone--ok',
  wait: 'atlas-of-tone atlas-of-tone--wait',
  warn: 'atlas-of-tone atlas-of-tone--warn',
  bad: 'atlas-of-tone atlas-of-tone--bad',
  muted: 'atlas-of-tone atlas-of-tone--muted',
}

/* ---------- Emails per recipient (booking drawer) ---------- */

export type EmailState = 'queued' | 'sent' | 'failed' | 'not-sent' | 'dry-run'

export const EMAIL_TEXT: Record<EmailState, string> = {
  queued: 'Queued',
  sent: 'Sent',
  failed: 'Failed',
  'not-sent': 'Not sent',
  'dry-run': 'Dry run, not sent',
}

export const EMAIL_TONE: Record<EmailState, Tone> = {
  queued: 'wait',
  sent: 'ok',
  failed: 'bad',
  'not-sent': 'warn',
  'dry-run': 'muted',
}

export interface EmailStatus {
  state: EmailState
  template: EmailTemplate
  at: string
}

/** The last email this booking asked to send `to`, and how it went. */
export function lastEmail(entries: OutboxEntry[], sessionId: string, to: EmailRecipient): EmailStatus | null {
  for (const e of [...entries].reverse()) {
    const notify = e.request.notify
    if (e.sessionId !== sessionId || e.status === 'withdrawn' || !notify?.[to]) continue
    let state: EmailState
    if (e.status === 'built') state = 'dry-run'
    else if (e.status === 'pending' || e.status === 'sending') state = 'queued'
    else if (e.emailed.includes(to)) state = 'sent'
    else if (!e.saved) state = 'failed'
    else state = 'not-sent'
    return { state, template: notify.template, at: e.sentAt ?? e.createdAt }
  }
  return null
}

/** A recipient the latest emailable change offers, and the email sent to them since (null: not yet). */
export interface OfferedEmail {
  to: EmailRecipient
  sent: EmailStatus | null
}

/**
 * The booking's latest change that can be emailed (book, reschedule, cancel, moderator
 * assigned) and, per recipient it offers, whether an email has gone out since.
 * null when the latest such change was withdrawn or there is none.
 */
export function offeredEmails(entries: OutboxEntry[], sessionId: string): { template: EmailTemplate; at: string; recipients: OfferedEmail[] } | null {
  const mine = entries.filter((e) => e.sessionId === sessionId && e.status !== 'withdrawn')
  const change = [...mine].reverse().find((e) => e.offerEmail)
  if (!change?.offerEmail) return null
  const after = mine.filter((e) => e.createdAt >= change.createdAt && e.key !== change.key)
  const recipients = change.offerEmail.to.map((to) => ({ to, sent: lastEmail(after, sessionId, to) }))
  return { template: change.offerEmail.template, at: change.createdAt, recipients }
}
