import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import TemplateEditor from '../components/templates/TemplateEditor.jsx'
import logoPng from '../assets/centific-logo.png'
import { FIELD_IDS, FIELD_LABEL } from '../lib/emailTemplates/blocks.ts'
import { TEMPLATES } from '../lib/emailTemplates/defaults.ts'
import { DARK, LIGHT } from '../lib/emailTemplates/palette.ts'
import { buildEmail, copyRich, copyText, fillFields, fillSubject, sanitize, tintedLogo, toPlainText } from '../lib/emailTemplates/render.ts'
import { useTemplateStore } from '../lib/emailTemplates/store.ts'
import { valuesFor } from '../lib/emailTemplates/values.ts'
import { longDayLabel } from '../lib/dates.js'
import useSlidingPill from '../motion/useSlidingPill.js'
import { useToast } from '../motion/Toast.jsx'
import { useAuth } from '../state/AuthContext.tsx'
import { useModerators } from '../state/ModeratorContext.jsx'
import { useRole } from '../state/RoleContext.jsx'
import { useSchedule } from '../state/ScheduleContext.jsx'
import { TODAY } from '../data/schedule.js'

// Email templates: Schedulers copy a ready email (filled from a booking) and
// paste it into Outlook. Admins also see the moderator email and can edit every
// template with the full editor.

const AUDIENCE_LABEL = { participant: 'To participants', moderator: 'To moderators' }
const MODES = [{ id: 'light', label: 'LIGHT' }, { id: 'dark', label: 'DARK' }]

const when = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function ModeToggle({ mode, onChange }) {
  const { trackRef, pillProps } = useSlidingPill(mode)
  return (
    <div ref={trackRef} className="atlas-view-switch atlas-view-switch--recessed" role="group" aria-label="Preview mode">
      <div {...pillProps} className={`${pillProps.className} atlas-view-pill`} />
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`atlas-view-tab atlas-tpl-mode${mode === m.id ? ' is-active' : ''}`}
          data-pill-active={mode === m.id}
          aria-pressed={mode === m.id}
          onClick={() => onChange(m.id)}
        >
          <span className="atlas-view-tab-dot" />
          <span className="atlas-eyebrow">{m.label}</span>
        </button>
      ))}
    </div>
  )
}

/** Bookings worth emailing about, soonest first. The cancellation email offers cancelled ones first. */
function bookingOptions(sessions, templateId) {
  const wantCancelled = templateId === 'participant-cancellation'
  const fits = (s) => (wantCancelled
    ? s.status === 'cancelled' || s.status === 'booked'
    : s.status === 'booked' || s.status === 'insession')
  return sessions
    .filter((s) => fits(s) && s.date >= TODAY)
    .sort((a, b) => (wantCancelled ? Number(b.status === 'cancelled') - Number(a.status === 'cancelled') : 0)
      || a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
}

export default function TemplatesView() {
  const toast = useToast()
  const { isAdmin } = useRole()
  const { user } = useAuth()
  const { sessions } = useSchedule()
  const { fullName } = useModerators()
  const store = useTemplateStore()

  const shown = useMemo(() => TEMPLATES.filter((t) => isAdmin || t.audience === 'participant'), [isAdmin])
  const [selected, setSelected] = useState(shown[0].id)
  const [mode, setMode] = useState('light')
  const [bookingId, setBookingId] = useState('')
  const [draft, setDraft] = useState(null)
  const [editorKey, setEditorKey] = useState(0)
  const [logos, setLogos] = useState({ light: null, dark: null })
  const subjectRef = useRef(null)

  const meta = shown.find((t) => t.id === selected) ?? shown[0]
  const content = store.get(meta.id)
  const editing = draft !== null

  useEffect(() => {
    let live = true
    Promise.all([tintedLogo(logoPng, LIGHT.logo), tintedLogo(logoPng, DARK.logo)])
      .then(([light, dark]) => { if (live) setLogos({ light, dark }) })
    return () => { live = false }
  }, [])

  const options = useMemo(() => bookingOptions(sessions, meta.id), [sessions, meta.id])
  const booking = options.find((s) => s.id === bookingId) ?? null
  const values = useMemo(() => valuesFor(booking, fullName), [booking, fullName])

  const subject = fillSubject(content.subject, values)
  const email = useMemo(
    () => buildEmail(fillFields(content.html, values), mode, logos[mode]),
    [content.html, values, mode, logos],
  )

  const pick = (id) => {
    if (editing || id === selected) return
    setSelected(id)
    setBookingId('')
  }

  const copyEmail = async () => {
    try {
      await copyRich(email, `${toPlainText(email)}`)
      toast(booking ? `Email for ${booking.name} copied. Paste it into Outlook.` : 'Email copied. Fill in the highlighted fields after you paste it.')
    } catch {
      toast('Couldn’t copy. Select the email and copy it by hand.', 'error')
    }
  }

  const copySubject = async () => {
    try {
      await copyText(subject)
      toast('Subject copied')
    } catch {
      toast('Couldn’t copy the subject.', 'error')
    }
  }

  const startEdit = () => {
    setDraft({ subject: content.subject, html: content.html })
    setMode('light')
    setEditorKey((k) => k + 1)
  }

  const onBody = useCallback((html) => setDraft((d) => (d ? { ...d, html } : d)), [])

  const save = () => {
    if (!draft) return
    if (!draft.subject.trim()) { toast('Add a subject line.', 'error'); return }
    try {
      store.save(meta.id, draft, user?.displayName ?? user?.email ?? 'Admin')
      setDraft(null)
      toast(`${meta.name} saved`)
    } catch {
      toast('Couldn’t save. The images may be too large; try smaller ones.', 'error')
    }
  }

  const cancel = () => {
    const kept = draft
    setDraft(null)
    const changed = kept && (kept.subject !== content.subject || sanitize(kept.html) !== content.html)
    if (changed) {
      toast('Changes discarded', 'info', {
        label: 'Undo',
        onAction: () => { setDraft(kept); setEditorKey((k) => k + 1) },
      })
    }
  }

  const reset = () => {
    const before = store.get(meta.id)
    store.reset(meta.id)
    setDraft(null)
    toast(`${meta.name} is back to the original`, 'info', {
      label: 'Undo',
      onAction: () => store.save(meta.id, before, before.updatedBy ?? 'Admin'),
    })
  }

  const addSubjectField = (id) => {
    if (!id || !draft) return
    const input = subjectRef.current
    const token = `{${id}}`
    const at = input?.selectionStart ?? draft.subject.length
    const end = input?.selectionEnd ?? at
    const next = draft.subject.slice(0, at) + token + draft.subject.slice(end)
    setDraft({ ...draft, subject: next })
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(at + token.length, at + token.length)
    })
  }

  const groups = ['participant', 'moderator']
    .map((a) => ({ audience: a, items: shown.filter((t) => t.audience === a) }))
    .filter((g) => g.items.length)

  return (
    <div className="atlas-app atlas-templates-view">
      <Sidebar />
      <main data-view-content className="atlas-templates-main atlas-view-enter">
        <div className="atlas-templates-panel">
          <header className="atlas-templates-head">
            <div>
              <span className="atlas-eyebrow">SCHEDULING</span>
              <h1 className="atlas-templates-title">Email templates</h1>
              <p className="atlas-templates-sub">
                Pick a booking, copy the email, and paste it into Outlook.{isAdmin ? ' Admins can edit every template.' : ''}
              </p>
            </div>
          </header>

          <div className="atlas-templates-body">
            <nav className="atlas-templates-list" aria-label="Templates">
              {groups.map((g) => (
                <div key={g.audience} className="atlas-templates-group">
                  <span className="atlas-eyebrow atlas-templates-group-title">{AUDIENCE_LABEL[g.audience]}</span>
                  {g.items.map((t, i) => {
                    const c = store.get(t.id)
                    const on = t.id === meta.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`atlas-templates-item atlas-row-in${on ? ' is-active' : ''}`}
                        style={{ animationDelay: `${i * 35}ms` }}
                        aria-current={on ? 'true' : undefined}
                        disabled={editing && !on}
                        onClick={() => pick(t.id)}
                      >
                        <span className="atlas-templates-item-name">{t.name}</span>
                        <span className="atlas-templates-item-when">{t.when}</span>
                        <span className="atlas-templates-item-meta">
                          {store.isEdited(t.id) && c.updatedAt ? `Edited ${when(c.updatedAt)}${c.updatedBy ? ` by ${c.updatedBy}` : ''}` : 'Original'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>

            <section className="atlas-templates-work" aria-label={meta.name}>
              {!editing ? (
                <div key={meta.id} className="atlas-templates-pane atlas-swap-in">
                  <div className="atlas-templates-bar">
                    <label className="atlas-templates-fill">
                      <span className="atlas-eyebrow">Fill from booking</span>
                      <select className="atlas-input atlas-templates-select" value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
                        <option value="">No booking (show fields to fill in)</option>
                        {options.map((s) => (
                          <option key={s.id} value={s.id}>
                            {`${longDayLabel(s.date)} · ${s.start} · ${s.name}${s.status === 'cancelled' ? ' (cancelled)' : ''}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <ModeToggle mode={mode} onChange={setMode} />
                  </div>

                  <div className="atlas-templates-subject atlas-well-sm">
                    <span className="atlas-eyebrow">Subject</span>
                    <span className="atlas-templates-subject-text">{subject}</span>
                    <button type="button" className="atlas-link atlas-templates-subject-copy" onClick={copySubject}>Copy</button>
                  </div>

                  <div className={`atlas-tpl-canvas atlas-well atlas-tpl-canvas--${mode}`}>
                    <div className="atlas-tpl-email" dangerouslySetInnerHTML={{ __html: email }} />
                  </div>

                  <footer className="atlas-templates-actions">
                    {isAdmin && (
                      <button type="button" className="atlas-btn-ghost atlas-templates-edit" onClick={startEdit}>Edit template</button>
                    )}
                    <button type="button" className="atlas-btn-primary atlas-btn-primary--compact atlas-templates-copy" onClick={copyEmail}>
                      Copy email
                    </button>
                  </footer>
                </div>
              ) : (
                <div className="atlas-templates-pane atlas-swap-in">
                  <div className="atlas-templates-subject-edit">
                    <label className="atlas-templates-subject-field">
                      <span className="atlas-eyebrow">Subject</span>
                      <input
                        ref={subjectRef}
                        className="atlas-input atlas-templates-subject-input"
                        value={draft.subject}
                        maxLength={160}
                        onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                      />
                    </label>
                    <label className="atlas-templates-subject-add">
                      <span className="atlas-eyebrow">Add field</span>
                      <select className="atlas-input atlas-templates-select" value="" onChange={(e) => addSubjectField(e.target.value)}>
                        <option value="">Choose…</option>
                        {FIELD_IDS.map((id) => <option key={id} value={id}>{FIELD_LABEL[id]}</option>)}
                      </select>
                    </label>
                  </div>

                  <TemplateEditor key={`${meta.id}-${editorKey}`} initialHtml={draft.html} onChange={onBody} />

                  <footer className="atlas-templates-actions">
                    {store.isEdited(meta.id) && (
                      <button type="button" className="atlas-link atlas-templates-reset" onClick={reset}>Reset to original</button>
                    )}
                    <button type="button" className="atlas-btn-ghost atlas-templates-edit" onClick={cancel}>Cancel</button>
                    <button type="button" className="atlas-btn-primary atlas-btn-primary--compact atlas-templates-copy" onClick={save}>Save template</button>
                  </footer>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
