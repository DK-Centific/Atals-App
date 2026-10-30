import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import { CloseIcon, PlusIcon } from '../components/Icons.jsx'
import { firstName } from '../data/moderators.js'
import { useModerators } from '../state/ModeratorContext.jsx'
import * as api from '../lib/auth/api.ts'
import { tempPassword } from '../lib/auth/crypto.ts'
import { MS } from '../motion/motion.js'
import usePresence from '../motion/usePresence.js'
import useFocusTrap, { returnFocus } from '../motion/useFocusTrap.js'
import { useToast } from '../motion/Toast.jsx'
import { useAuth } from '../state/AuthContext.tsx'
import { ROLES } from '../state/RoleContext.jsx'
import TourButton from '../tour/TourButton.jsx'

// Admin > Users: who can sign in to Atlas, with which role. Active moderators are
// the people sessions can be booked with. Adding a
// person or resetting a password makes a temp password here in the browser and
// shows it once; only its hash goes to SharePoint. The person picks their own
// password at first sign-in.

const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.id, r.label]))
const ROLE_NOTE = { admin: 'Everything, including users', scheduler: 'Booking app', moderator: 'Checklist for their own sessions; bookable' }
const EMPTY = { email: '', displayName: '', role: 'moderator', shortName: '' }

function stateOf(u) {
  if (!u.active) return { id: 'off', label: 'Turned off' }
  if (u.lockedUntil && Date.parse(u.lockedUntil) > Date.now()) return { id: 'locked', label: 'Locked 15 min' }
  if (u.mustChangePassword) return { id: 'temp', label: 'Temp password' }
  return { id: 'active', label: 'Active' }
}

const when = (iso) => (iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never')

function RolePicker({ value, onChange }) {
  return (
    <div className="atlas-user-roles" role="radiogroup" aria-label="Role">
      {ROLES.map((r) => (
        <button
          key={r.id}
          type="button"
          role="radio"
          aria-checked={value === r.id}
          className={`atlas-user-role${value === r.id ? ' is-active' : ''}`}
          onClick={() => onChange(r.id)}
        >
          <span className="atlas-user-role-name">{r.label}</span>
          <span className="atlas-user-role-note">{ROLE_NOTE[r.id]}</span>
        </button>
      ))}
    </div>
  )
}

function TempReveal({ user, temp, onDone }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(temp); setCopied(true) } catch { toast('Couldn’t copy. Select the password and copy it by hand.', 'error') }
  }
  return (
    <div className="atlas-sheet-content atlas-swap-in">
      <SheetHead eyebrow="TEMP PASSWORD" title={user.displayName} sub={user.email} onClose={onDone} />
      <div className="atlas-sheet-body">
        <p className="atlas-user-temp-text">Give {user.displayName.split(' ')[0]} this password. It shows only once; they choose their own the first time they sign in.</p>
        <output className="atlas-user-temp atlas-well" aria-label="Temp password">{temp}</output>
        <p className="atlas-user-temp-hint">Send it apart from the email address (for example by text or in person), never in the same message.</p>
      </div>
      <footer className="atlas-sheet-foot">
        <div className="atlas-sheet-actions">
          <button type="button" className="atlas-btn-ghost atlas-raised-sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          <button type="button" className="atlas-btn-primary" onClick={onDone}>Done</button>
        </div>
      </footer>
    </div>
  )
}

function SheetHead({ eyebrow, title, sub, onClose }) {
  return (
    <header className="atlas-sheet-head">
      <div className="atlas-sheet-head-text">
        <span className="atlas-eyebrow">{eyebrow}</span>
        <h2 className="atlas-sheet-title">{title}</h2>
        {sub && <div className="atlas-sheet-sub">{sub}</div>}
      </div>
      <button type="button" className="atlas-sheet-close atlas-icon-btn atlas-raised-sm" aria-label="Close" onClick={onClose}>
        <CloseIcon />
      </button>
    </header>
  )
}

function UserForm({ user, self, onSave, onReset, onToggle, onClose }) {
  const adding = !user
  const [form, setForm] = useState(() => (user ? { ...user, shortName: user.shortName ?? '' } : EMPTY))
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  // 'reset' | 'toggle' while that Auth call runs (a few seconds): the button says so,
  // and nothing can be clicked twice (two resets would make two temp passwords).
  const [pending, setPending] = useState(null)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const run = (kind, action) => async () => {
    if (pending || busy) return
    setPending(kind)
    try { await action() } finally { setPending(null) }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.displayName.trim()) return setError('Add their name.')
    if (adding && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return setError('Add a valid email.')
    setBusy(true)
    setError(null)
    try {
      await onSave({ ...form, shortName: form.shortName.trim() || null })
    } catch (err) {
      setError(err?.message || 'That didn’t save.')
      setBusy(false)
    }
  }

  return (
    <form className="atlas-sheet-form atlas-sheet-content atlas-swap-in" onSubmit={submit} noValidate>
      <SheetHead eyebrow={adding ? 'NEW USER' : 'EDIT USER'} title={adding ? 'Add a person' : user.displayName} sub={adding ? 'They get a temp password.' : user.email} onClose={onClose} />
      <div className="atlas-sheet-body">
        <label className="atlas-field">
          <span className="atlas-eyebrow">Name</span>
          <input className="atlas-input" value={form.displayName} onChange={(e) => set('displayName')(e.target.value)} autoComplete="off" autoFocus />
        </label>
        {adding && (
          <label className="atlas-field">
            <span className="atlas-eyebrow">Email</span>
            <input className="atlas-input" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
          </label>
        )}
        <div className="atlas-field">
          <span className="atlas-eyebrow">Role</span>
          {self ? <p className="atlas-user-self">You can’t change your own role.</p> : <RolePicker value={form.role} onChange={set('role')} />}
        </div>
        <label className="atlas-field">
          <span className="atlas-eyebrow">Shown as</span>
          <input
            className="atlas-input"
            value={form.shortName}
            placeholder={firstName({ displayName: form.displayName }) || 'First name'}
            onChange={(e) => set('shortName')(e.target.value)}
            autoComplete="off"
          />
          <span className="atlas-field-hint">The name on session cards and pickers. Leave empty to use the first name.</span>
        </label>
        {!adding && !self && (
          <div className="atlas-user-more">
            <button type="button" className="atlas-btn-ghost atlas-raised-sm" onClick={run('reset', onReset)} disabled={busy || Boolean(pending)} aria-busy={pending === 'reset'}>
              {pending === 'reset' ? 'Resetting…' : 'Reset password'}
            </button>
            <button type="button" className={user.active ? 'atlas-btn-danger atlas-raised-sm' : 'atlas-btn-ghost atlas-raised-sm'} onClick={run('toggle', onToggle)} disabled={busy || Boolean(pending)} aria-busy={pending === 'toggle'}>
              {pending === 'toggle' ? 'Saving…' : user.active ? 'Turn off sign-in' : 'Turn sign-in back on'}
            </button>
          </div>
        )}
      </div>
      <footer className="atlas-sheet-foot">
        <p className="atlas-signin-error" role="alert">{error ?? ''}</p>
        <button type="submit" className="atlas-btn-primary" disabled={busy || Boolean(pending)} aria-busy={busy}>{busy ? 'Saving…' : adding ? 'Add and make temp password' : 'Save changes'}</button>
      </footer>
    </form>
  )
}

export default function UsersView() {
  const { token, user: me, local } = useAuth()
  const { refresh: refreshModerators } = useModerators()
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [loadError, setLoadError] = useState(null)
  // { mode: 'add' } | { mode: 'edit', email } | { mode: 'temp', user, temp }
  const [sheet, setSheet] = useState(null)
  const last = useRef(sheet)
  if (sheet) last.current = sheet
  const shown = last.current
  const { mounted, state, onAnimationEnd } = usePresence(Boolean(sheet), MS.sheetExit)
  const sheetRef = useRef(null)
  const trigger = useRef(null)
  useFocusTrap(sheetRef, Boolean(sheet) && mounted)

  useEffect(() => { document.title = 'Atlas | Users' }, [])

  const load = useCallback(async () => {
    try {
      setUsers(await api.listUsers(token))
      setLoadError(null)
    } catch (err) {
      setLoadError(err?.message || 'Couldn’t load users.')
    }
  }, [token])
  useEffect(() => { void load() }, [load])

  const close = useCallback(() => { setSheet(null); returnFocus(trigger.current) }, [])
  useEffect(() => {
    if (!sheet) return undefined
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheet, close])

  const open = (next) => (e) => { trigger.current = e.currentTarget; setSheet(next) }

  const save = async (form) => {
    if (sheet?.mode === 'add') {
      const temp = tempPassword()
      await api.createUser(token, form, temp)
      setSheet({ mode: 'temp', user: form, temp })
    } else {
      const before = users.find((u) => u.email === sheet.email)
      const changes = { displayName: form.displayName }
      if (form.role !== before.role) changes.role = form.role
      if ((form.shortName ?? null) !== (before.shortName ?? null)) changes.shortName = form.shortName
      await api.updateUser(token, before.email, changes)
      toast(`${form.displayName} saved`)
      close()
    }
    void load()
    void refreshModerators()
  }

  const reset = async (u) => {
    const temp = tempPassword()
    try {
      await api.resetUser(token, u.email, temp)
      setSheet({ mode: 'temp', user: u, temp })
      void load()
    } catch (err) { toast(err?.message || 'Couldn’t reset the password.', 'error') }
  }

  const toggle = async (u) => {
    try {
      await api.updateUser(token, u.email, { active: !u.active })
      toast(u.active ? `${u.displayName} can no longer sign in` : `${u.displayName} can sign in again`)
      close()
      void load()
      void refreshModerators()
    } catch (err) { toast(err?.message || 'Couldn’t change that.', 'error') }
  }

  const editing = shown?.mode === 'edit' ? users?.find((u) => u.email === shown.email) : null

  return (
    <div className="atlas-app atlas-users-view">
      <Sidebar />
      <main data-view-content className="atlas-users-main atlas-view-enter">
        <div className="atlas-users-panel">
          <header className="atlas-users-head">
            <div>
              <span className="atlas-eyebrow">ADMIN</span>
              <h1 className="atlas-users-title">Users</h1>
              <p className="atlas-users-sub">
                Who can sign in, and what they see.{local ? ' Test mode: kept in this browser until the sign-in flow is connected.' : ''}
              </p>
            </div>
            <div className="atlas-head-actions">
              <TourButton />
              <button type="button" className="atlas-btn-primary atlas-btn-primary--compact atlas-users-add" data-tour="users-add" onClick={open({ mode: 'add' })}>
                <PlusIcon /> Add user
              </button>
            </div>
          </header>

          {loadError && <p className="atlas-users-error" role="alert">{loadError} <button type="button" className="atlas-link" onClick={() => void load()}>Try again</button></p>}

          <div className="atlas-users-table atlas-well" role="table" aria-label="Users" data-tour="users-table">
            <div className="atlas-users-row atlas-users-row--head" role="row">
              {['Name', 'Role', 'Shown as', 'Status', 'Last sign-in'].map((h) => <span key={h} role="columnheader" className="atlas-eyebrow">{h}</span>)}
            </div>
            {users === null && !loadError && <p className="atlas-empty atlas-users-empty">Loading…</p>}
            {users?.map((u, i) => {
              const st = stateOf(u)
              return (
                <button
                  key={u.email}
                  type="button"
                  role="row"
                  className={`atlas-users-row atlas-users-row--item atlas-row-in${u.active ? '' : ' is-off'}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  onClick={open({ mode: 'edit', email: u.email })}
                  aria-label={`Edit ${u.displayName}`}
                >
                  <span role="cell" className="atlas-users-name">
                    <span>{u.displayName}{u.email === me?.email ? ' (you)' : ''}</span>
                    <span className="atlas-users-email">{u.email}</span>
                  </span>
                  <span role="cell">{ROLE_LABEL[u.role] ?? u.role}</span>
                  <span role="cell">{firstName(u) || '–'}</span>
                  <span role="cell"><span className={`atlas-users-state atlas-users-state--${st.id}`}>{st.label}</span></span>
                  <span role="cell" className="atlas-users-when">{when(u.lastSignIn)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </main>

      {mounted && shown && (
        <div className="atlas-sheet-layer" data-state={state}>
          <div className="atlas-sheet-scrim" onClick={close} />
          <aside
            ref={sheetRef}
            className="atlas-sheet atlas-raised"
            data-state={state}
            role="dialog"
            aria-modal="true"
            aria-label={shown.mode === 'add' ? 'Add user' : shown.mode === 'temp' ? 'Temp password' : 'Edit user'}
            onAnimationEnd={onAnimationEnd}
          >
            <div className="atlas-sheet-grab" aria-hidden="true" />
            {shown.mode === 'temp' && <TempReveal key={shown.temp} user={shown.user} temp={shown.temp} onDone={close} />}
            {shown.mode === 'add' && <UserForm key="add" user={null} self={false} onSave={save} onClose={close} />}
            {shown.mode === 'edit' && editing && (
              <UserForm
                key={editing.email}
                user={editing}
                self={editing.email === me?.email}
                onSave={save}
                onReset={() => reset(editing)}
                onToggle={() => toggle(editing)}
                onClose={close}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
