import { useEffect, useRef, useState } from 'react'
import { ROLES, useRole } from '../state/RoleContext.jsx'

// Stand-in for sign-in: the avatar shows who you are and switches role.
export default function RoleSwitch() {
  const { role, setRole, label } = useRole()
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

  return (
    <div ref={ref} className="atlas-role">
      <button
        type="button"
        className="atlas-role-trigger atlas-well-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Signed in as ${label}. Switch role`}
        title={`Signed in as ${label}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label.slice(0, 2).toUpperCase()}
      </button>
      {open && (
        <div role="menu" aria-label="Switch role" className="atlas-role-menu atlas-raised-sm">
          <div className="atlas-eyebrow atlas-menu-title">SIGNED IN AS</div>
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="menuitemradio"
              aria-checked={role === r.id}
              className={`atlas-menu-item atlas-role-item${role === r.id ? ' is-active' : ''}`}
              onClick={() => { setRole(r.id); setOpen(false) }}
            >
              {r.label}
              {r.id === 'moderator' && <span className="atlas-role-note">no booking access</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
