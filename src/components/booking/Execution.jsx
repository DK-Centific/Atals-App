import { DRY_RUN } from '../../lib/oneforma/config.ts'
import { QA_STAGE_LABEL, isLinked } from '../../lib/oneforma/events.ts'
import { OUTBOX_TEXT, OUTBOX_TONE, TONE_CLASS } from '../../lib/oneforma/outboxStatus.ts'
import { useParticipant } from '../../state/ParticipantContext.jsx'
import { useSchedule } from '../../state/ScheduleContext.jsx'
import { useLatestFor, useSync } from '../../state/SyncContext.tsx'

// Where this booking's latest change stands (SharePoint, emails, OneForma), under the sheet title. Opens the sync panel.
export function OneFormaLine({ session: s }) {
  const latest = useLatestFor(s.id)
  const participant = useParticipant(s.participantId)
  const { setOpen } = useSync()

  let tone = 'muted'
  let text = isLinked(s)
    ? 'Linked to OneForma · no changes made here yet'
    : 'Not linked to a OneForma participant · changes save to SharePoint only'
  if (isLinked(s) && participant && !participant.active) {
    tone = 'warn'
    text = 'Removed from the OneForma project: no new bookings'
  } else if (latest) {
    tone = OUTBOX_TONE[latest.status]
    text = `${latest.label} · ${OUTBOX_TEXT[latest.status]}${latest.emailed.length ? ' · Emailed' : ''}`
  }

  return (
    <button
      type="button"
      className={`atlas-of-line ${TONE_CLASS[tone]}`}
      title={latest?.message ?? (DRY_RUN ? 'Dry run: changes are built and checked but not saved or sent' : undefined)}
      onClick={() => setOpen(true)}
    >
      <span className="atlas-of-dot" aria-hidden="true" />
      <span className="atlas-eyebrow atlas-of-line-source">SYNC</span>
      <span key={text} className="atlas-of-line-text atlas-status-line">{text}</span>
    </button>
  )
}

const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')
const minutes = (secs) => `${Math.round(secs / 60)} min`

const QA_RESULT = {
  passed: { text: 'Passed', tone: 'ok' },
  failed: { text: 'Failed', tone: 'bad' },
  pending: { text: 'In review', tone: 'wait' },
  not_required: { text: 'Not required', tone: 'muted' },
}

function Row({ label, value, tone = 'muted', children }) {
  return (
    <div className="atlas-exec-row">
      <div className="atlas-exec-text">
        <span className="atlas-eyebrow">{label}</span>
        <span key={value} className={`atlas-exec-value ${TONE_CLASS[tone]} atlas-status-line`}>{value}</span>
      </div>
      {children && <div className="atlas-exec-actions">{children}</div>}
    </div>
  )
}

// Session, recording and QA milestones for a session that has started.
// Each button saves the milestone and reports it to OneForma when the booking is linked.
export function ExecutionSection({ session: s }) {
  const { openBooking, setQa } = useSchedule()
  if (s.status !== 'insession' && s.status !== 'completed') return null
  const recording = s.recordings?.[s.recordings.length - 1] ?? null
  const usable = recording?.status === 'completed'
  // A result only counts for the recording version it was given on.
  const qa = (stage) => {
    const result = s.qa?.[stage]
    return result && recording && result.mediaVersion === recording.version ? result : null
  }
  const check = qa('onsite_check')
  const review = qa('internal_qa')

  return (
    <section className="atlas-exec" aria-label="Session and QA">
      <div className="atlas-eyebrow">SESSION & QA</div>

      <Row
        label="SESSION"
        tone={s.status === 'completed' ? 'ok' : 'wait'}
        value={s.status === 'completed'
          ? `${timeOf(s.actualStart)} – ${timeOf(s.actualEnd)}`
          : `Started ${timeOf(s.actualStart) || s.start}`}
      />

      {s.status === 'completed' && (
        <>
          <Row
            label="RECORDING"
            tone={!recording ? 'muted' : usable ? 'ok' : 'bad'}
            value={!recording
              ? 'Not logged yet'
              : `v${recording.version} · ${usable ? minutes(recording.durationSeconds) : 'failed'} · ${recording.mediaRef}`}
          >
            <button type="button" className="atlas-exec-btn" onClick={() => openBooking(s.id, 'recording')}>
              {recording ? 'Re-record' : 'Log'}
            </button>
            {!recording && (
              <button type="button" className="atlas-exec-btn atlas-exec-btn--bad" onClick={() => openBooking(s.id, 'recording-failed')}>Failed</button>
            )}
          </Row>

          {usable && (
            <>
              <Row
                label={QA_STAGE_LABEL.onsite_check.toUpperCase()}
                tone={check ? QA_RESULT[check.result].tone : 'muted'}
                value={check ? QA_RESULT[check.result].text : 'Not reported'}
              >
                {check?.result !== 'passed' && (
                  <button type="button" className="atlas-exec-btn" onClick={() => setQa(s.id, 'onsite_check', 'passed')}>Pass</button>
                )}
                {check?.result !== 'failed' && (
                  <button type="button" className="atlas-exec-btn atlas-exec-btn--bad" onClick={() => openBooking(s.id, 'qa-fail:onsite_check')}>Fail</button>
                )}
              </Row>
              <Row
                label={QA_STAGE_LABEL.internal_qa.toUpperCase()}
                tone={review ? QA_RESULT[review.result].tone : 'muted'}
                value={review ? QA_RESULT[review.result].text : 'Not started'}
              >
                {!review && (
                  <button type="button" className="atlas-exec-btn" onClick={() => setQa(s.id, 'internal_qa', 'pending')}>Start review</button>
                )}
                {review?.result === 'pending' && (
                  <>
                    <button type="button" className="atlas-exec-btn" onClick={() => setQa(s.id, 'internal_qa', 'passed')}>Approve</button>
                    <button type="button" className="atlas-exec-btn atlas-exec-btn--bad" onClick={() => openBooking(s.id, 'qa-fail:internal_qa')}>Reject</button>
                  </>
                )}
              </Row>
            </>
          )}
        </>
      )}
    </section>
  )
}
