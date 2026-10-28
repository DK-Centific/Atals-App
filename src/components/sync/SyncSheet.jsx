import { useEffect, useRef, useState } from 'react'
import { OF_PROJECT_ID } from '../../lib/oneforma/config.ts'
import { OUTBOX_TEXT, OUTBOX_TONE, TONE_CLASS } from '../../lib/oneforma/outboxStatus.ts'
import Collapse from '../../motion/Collapse.jsx'
import { MS, useStagger } from '../../motion/motion.js'
import usePresence from '../../motion/usePresence.js'
import useFocusTrap from '../../motion/useFocusTrap.js'
import useSlidingPill from '../../motion/useSlidingPill.js'
import { useParticipants } from '../../state/ParticipantContext.jsx'
import { useSchedule } from '../../state/ScheduleContext.jsx'
import { NEEDS_ATTENTION, useSync } from '../../state/SyncContext.tsx'
import { CloseIcon } from '../Icons.jsx'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Needs attention' },
]

// Who the change emails, or who it did email once the flow has answered.
export function emailText(e) {
  if (e.emailed?.length) return `Emailed ${e.emailed.join(' and ')}`
  const n = e.request.notify
  const who = [n?.participant && 'participant', n?.moderator && 'moderator'].filter(Boolean)
  if (!who.length) return 'No email'
  return e.saved ? 'Email not sent' : `Emails ${who.join(' and ')}`
}

const timeOf = (iso) => (iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')

// Right-hand sheet with both directions: the OneForma participant feed coming in,
// and every change Atlas saves to SharePoint (with its emails and OneForma event) going out.
export default function SyncSheet() {
  const { open, setOpen } = useSync()
  const { mounted, state, onAnimationEnd } = usePresence(open, MS.sheetExit)
  const sheetRef = useRef(null)
  const opener = useRef(null)

  useEffect(() => {
    if (open) { opener.current = document.activeElement; return undefined }
    if (opener.current?.isConnected) opener.current.focus({ preventScroll: true })
    return undefined
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  useFocusTrap(sheetRef, open && mounted)
  if (!mounted) return null

  return (
    <div className="atlas-sheet-layer atlas-sheet-layer--top" data-state={state}>
      <div className="atlas-sheet-scrim" onClick={() => setOpen(false)} />
      <aside
        ref={sheetRef}
        className="atlas-sheet atlas-raised"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label="Sync"
        onAnimationEnd={onAnimationEnd}
      >
        <div className="atlas-sheet-grab" aria-hidden="true" />
        <SyncContent onClose={() => setOpen(false)} />
      </aside>
    </div>
  )
}

function SyncContent({ onClose }) {
  const { entries, dryRun, env, attention } = useSync()
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const { trackRef, pillProps } = useSlidingPill(filter)
  const list = [...entries].reverse().filter((e) => filter === 'all' || NEEDS_ATTENTION.has(e.status))
  const stagger = useStagger(list.map((e) => e.key))

  return (
    <div className="atlas-sheet-content">
      <header className="atlas-sheet-head">
        <div className="atlas-sheet-head-text">
          <span className="atlas-eyebrow">ONEFORMA · {env.toUpperCase()} · PROJECT {OF_PROJECT_ID}</span>
          <h2 className="atlas-sheet-title">Sync</h2>
          <div className="atlas-sheet-sub">
            {dryRun
              ? 'Dry run: changes are built and checked here. Nothing is saved to SharePoint, emailed or sent to OneForma.'
              : 'Live: each change is saved to SharePoint through Power Automate, which also sends the emails and tells OneForma.'}
          </div>
        </div>
        <button type="button" className="atlas-sheet-close atlas-icon-btn atlas-raised-sm" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>

      <div className="atlas-sheet-body">
        <section className="atlas-sync-sources" aria-label="Sources">
          <FeedLine />
          <OutboxLine count={entries.length} attention={attention} dryRun={dryRun} />
        </section>

        <div ref={trackRef} className="atlas-sync-filter" role="group" aria-label="Show changes">
          <div {...pillProps} className={`${pillProps.className} atlas-sync-filter-pill`} />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`atlas-sync-filter-tab${filter === f.id ? ' is-active' : ''}`}
              data-pill-active={filter === f.id}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}{f.id === 'attention' && attention > 0 ? ` · ${attention}` : ''}
            </button>
          ))}
        </div>

        {list.length === 0 && (
          <div className="atlas-activity-empty">
            {filter === 'all'
              ? 'Nothing yet. Book, edit, start or QA a session and the change shows here.'
              : 'Nothing needs attention.'}
          </div>
        )}
        <ol className="atlas-sync-list">
          {list.map((e) => (
            <SyncRow
              key={e.key}
              entry={e}
              style={stagger(e.key)}
              open={expanded === e.key}
              onToggle={() => setExpanded((k) => (k === e.key ? null : e.key))}
              onClose={onClose}
            />
          ))}
        </ol>
      </div>
    </div>
  )
}

// Per-source status lines (spec section 7): a dot, a short summary, detail in the tooltip.
function FeedLine() {
  const { sync, participants, stats, usingSample } = useParticipants()
  const active = participants.filter((p) => p.active).length
  const state = sync.state === 'loading' ? 'wait' : sync.state === 'failed' ? 'bad' : 'ok'
  const text = sync.state === 'loading'
    ? 'Reading the participant feed'
    : sync.state === 'failed'
      ? 'Refresh failed'
      : `${active} endorsed · ${stats?.removed ?? 0} removed`
  return (
    <div className={`atlas-sync-source ${TONE_CLASS[state]}`} role="status" aria-live="polite" title={sync.error ?? undefined}>
      <span className="atlas-of-dot" aria-hidden="true" />
      <div className="atlas-sync-source-text">
        <span className="atlas-eyebrow">PARTICIPANTS IN {usingSample && <span className="atlas-queue-mock">SAMPLE</span>}</span>
        <span key={text} className="atlas-sync-source-main atlas-status-line">{text}</span>
        {stats && sync.state !== 'loading' && (
          <span className="atlas-sync-source-meta">
            {stats.messages} messages · {stats.duplicates} replays skipped · {stats.otherProject} other-project items ignored · {stats.stale} out-of-order skipped · {stats.malformed} malformed
          </span>
        )}
      </div>
    </div>
  )
}

function OutboxLine({ count, attention, dryRun }) {
  const tone = attention ? 'bad' : count ? 'ok' : 'muted'
  const text = count ? `${count} changes${attention ? ` · ${attention} need attention` : ''}` : 'No changes yet'
  return (
    <div className={`atlas-sync-source ${TONE_CLASS[tone]}`} role="status" aria-live="polite">
      <span className="atlas-of-dot" aria-hidden="true" />
      <div className="atlas-sync-source-text">
        <span className="atlas-eyebrow">CHANGES OUT</span>
        <span key={text} className="atlas-sync-source-main atlas-status-line">{text}</span>
        <span className="atlas-sync-source-meta">
          {dryRun ? 'Set VITE_ATLAS_ACTION_URL to save through Power Automate.' : 'Each change waits 10s so Undo can still pull it back.'}
        </span>
      </div>
    </div>
  )
}

function SyncRow({ entry: e, style, open, onToggle, onClose }) {
  const { retry } = useSync()
  const { openBooking, sessions } = useSchedule()
  const tone = OUTBOX_TONE[e.status]
  const exists = sessions.some((s) => s.id === e.sessionId)
  const detailId = `atlas-sync-${e.key}`
  const event = e.request.oneforma

  return (
    <li className="atlas-sync-row atlas-row-in" style={style}>
      <button type="button" className="atlas-sync-row-head" aria-expanded={open} aria-controls={detailId} onClick={onToggle}>
        <span className={`atlas-of-dot ${TONE_CLASS[tone]}`} aria-hidden="true" />
        <span className="atlas-sync-row-text">
          <span className="atlas-sync-row-title">{e.label} · {e.participantName}</span>
          <span className="atlas-sync-row-meta">
            {event ? `${event.eventType} · r${event.revision}` : 'No OneForma event'}
            {e.request.notify ? ` · ${emailText(e)}` : ''} · {timeOf(e.createdAt)}
          </span>
        </span>
        <span key={e.status} className={`atlas-sync-row-status ${TONE_CLASS[tone]} atlas-status-line`}>
          {OUTBOX_TEXT[e.status]}{e.duplicate ? ' (duplicate)' : ''}
        </span>
      </button>
      <Collapse open={open} id={detailId}>
        <div className="atlas-sync-row-detail">
          {e.message && <div className={`atlas-sync-row-message ${TONE_CLASS[tone]}`}>{e.message}</div>}
          <pre className="atlas-sync-json">{JSON.stringify(e.request, null, 2)}</pre>
          <div className="atlas-sync-row-actions">
            {exists && (
              <button type="button" className="atlas-link" onClick={() => { onClose(); openBooking(e.sessionId) }}>Open booking</button>
            )}
            {e.status === 'failed' && (
              <button type="button" className="atlas-link" onClick={() => retry(e.key)}>Send again</button>
            )}
          </div>
        </div>
      </Collapse>
    </li>
  )
}
