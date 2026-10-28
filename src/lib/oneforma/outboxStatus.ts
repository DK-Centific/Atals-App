// Words and tones for outbox states, shared by the booking drawer and the sync panel.

import type { OutboxStatus } from './types.ts'

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
