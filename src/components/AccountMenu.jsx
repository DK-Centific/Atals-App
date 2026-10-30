import { useEffect, useRef, useState } from 'react'
import { DEMO, setDemo } from '../lib/oneforma/config.ts'
import { installMode, onInstallChange, promptInstall } from '../lib/appInstall.js'
import { useToast } from '../motion/Toast.jsx'
import { useAuth } from '../state/AuthContext.tsx'
import { useRole } from '../state/RoleContext.jsx'
import { useSync } from '../state/SyncContext.tsx'
import { useTour } from '../tour/TourContext.jsx'

/** Outbox states still on their way to SharePoint. */
const UNSENT = new Set(['pending', 'sending', 'failed'])

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

// The avatar: who is signed in, and sign-out. Sign-out waits while changes are
// still being sent, so the next person on this device never sends them as theirs.
export default function AccountMenu({ placement = 'rail' }) {
  const { user, signOut } = useAuth()
  const { label, canBook } = useRole()
  const { entries } = useSync()
  const { replayAll } = useTour()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  // 'prompt' | 'ios' | null: whether "Install app" can be offered on this device.
  const [install, setInstall] = useState(installMode)
  useEffect(() => onInstallChange(() => setInstall(installMode())), [])
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

  const installApp = async () => {
    setOpen(false)
    if (install === 'ios') {
      toast('To install Atlas: tap the Share button, then “Add to Home Screen”.')
      return
    }
    if (await promptInstall()) toast('Atlas is installed. Open it from your home screen or app list.')
  }

  // Switching reloads into the other mode; real changes still on their way would
  // wait until switching back, so finish sending them first.
  const toggleDemo = () => {
    if (unsent && !DEMO) {
      toast(`${unsent} change${unsent > 1 ? 's are' : ' is'} still being saved. Switch to demo data once ${unsent > 1 ? 'they’re' : 'it’s'} done.`, 'error')
      return
    }
    setDemo(!DEMO)
  }

  return (
    <div ref={ref} className={`atlas-role atlas-role--${placement}`} data-tour="account">
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
          {canBook && (
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={DEMO}
              className="atlas-menu-item atlas-account-demo"
              title={DEMO ? 'Back to the real OneForma participants and bookings' : 'Sample participants and bookings; nothing is saved, sent or emailed'}
              onClick={toggleDemo}
            >
              <span>Demo data</span>
              <span className={`atlas-account-switch${DEMO ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
            </button>
          )}
          {canBook && (
            <button type="button" role="menuitem" className="atlas-menu-item atlas-account-tour" onClick={() => { setOpen(false); replayAll() }}>
              Take the tour
            </button>
          )}
          {install && (
            <button type="button" role="menuitem" className="atlas-menu-item atlas-account-install" onClick={installApp}>
              Install app
            </button>
          )}
          <button type="button" role="menuitem" className="atlas-menu-item atlas-account-signout" onClick={leave}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
