import { useEffect, useRef, useState } from 'react'
import { useToast } from '../motion/Toast.jsx'
import { useAuth } from '../state/AuthContext.tsx'
import { useRole } from '../state/RoleContext.jsx'
import { useSync } from '../state/SyncContext.tsx'

/** Outbox states still on their way to SharePoint. */
const UNSENT = new Set(['pending', 'sending', 'failed'])

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

// The avatar: who is signed in, and sign-out. Sign-out waits while changes are
// still being sent, so the next person on this device never sends them as theirs.
export default function AccountMenu({ placement = 'rail' }) {
  const { user, signOut } = useAuth()
  const { label } = useRole()
  const { entries } = useSync()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus() } }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!user) return null
  const unsent = entries.filter((e) => UNSENT.has(e.status)).length

  const leave = () => {
    if (unsent) {
      toast(`${unsent} change${unsent > 1 ? 's are' : ' is'} still being saved. Sign out once ${unsent > 1 ? 'they’re' : 'it’s'} done.`, 'error')
      return
    }
    setOpen(false)
    void signOut()
  }

  return (
    <div ref={ref} className={`atlas-role atlas-role--${placement}`}>
      <button
        type="button"
        className="atlas-role-trigger atlas-well-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Signed in as ${user.displayName}, ${label}. Account menu`}
        title={`${user.displayName} · ${label}`}
        onClick={() => setOpen((o) => !o)}
      >
        {initials(user.displayName)}
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="atlas-role-menu atlas-account-menu atlas-raised-sm">
          <div className="atlas-account-head">
            <span className="atlas-account-name">{user.displayName}</span>
            <span className="atlas-account-email">{user.email}</span>
            <span className="atlas-eyebrow atlas-account-role">{label}</span>
          </div>
          <button type="button" role="menuitem" className="atlas-menu-item atlas-account-signout" onClick={leave}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
