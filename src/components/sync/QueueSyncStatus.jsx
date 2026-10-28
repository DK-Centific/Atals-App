import { useEffect, useState } from 'react'
import { TONE_CLASS } from '../../lib/oneforma/outboxStatus.ts'
import { ago, feedHealth } from '../../lib/oneforma/syncHealth.ts'
import { useParticipants } from '../../state/ParticipantContext.jsx'

const TONE = { sample: 'muted', live: 'ok', stale: 'warn', unconnected: 'muted' }

// Badge in the "From OneForma queue" header: is the OneForma feed reaching Atlas?
// A dot plus words, so colour is never the only cue. The tooltip has the detail,
// including when Atlas last loaded its copy.
export default function QueueSyncStatus() {
  const { oneformaSync: of, fetchedAt, sync, usingSample } = useParticipants()
  const [now, setNow] = useState(() => Date.now())

  // Relative times move on once a minute.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { setNow(Date.now()) }, [fetchedAt, of])

  const health = feedHealth(of, usingSample, now)
  const label = {
    sample: 'Sample data',
    live: `Live · updated ${ago(of?.lastContactAt, now)}`,
    stale: `Not receiving · last contact ${ago(of?.lastContactAt, now) ?? 'unknown'}`,
    unconnected: 'Not connected yet',
  }[health]

  const loaded = sync.state === 'loading'
    ? 'Loading from Atlas…'
    : sync.state === 'failed'
      ? `Atlas couldn’t load the queue${fetchedAt ? `; showing the copy from ${ago(fetchedAt, now)}` : ''}`
      : fetchedAt && `Loaded ${ago(fetchedAt, now)}`
  const detail = {
    sample: 'Test mode: sample participants, not the OneForma feed.',
    live: of?.lastEventAt
      ? `Last new participants ${ago(of.lastEventAt, now)}${of.lastEventCount != null ? ` (${of.lastEventCount})` : ''}.`
      : 'No new participants received yet.',
    stale: of?.lastError ? `Last error: ${String(of.lastError).slice(0, 120)}` : 'No contact from the OneForma relay for over 2 hours.',
    unconnected: 'Waiting for the OneForma relay to be set up.',
  }[health]
  const title = [detail, loaded].filter(Boolean).join('\n')

  return (
    <span className={`atlas-queue-sync ${TONE_CLASS[TONE[health]]}`} role="status" aria-live="polite" title={title}>
      <span className="atlas-of-dot" aria-hidden="true" />
      <span key={label} className="atlas-queue-sync-text atlas-status-line">{label}</span>
      <span className="atlas-sr-only">. {title}</span>
    </span>
  )
}
