import { createContext, useCallback, useContext, useMemo, useState } from 'react'

// Who is signed in. Until real sign-in exists this is a switch on the sidebar
// avatar, remembered in this browser. The Booking app is for Admin and Scheduler;
// only Admin can force a OneForma sync.
export const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'moderator', label: 'Moderator' },
]
export const BOOKING_ROLES = ['admin', 'scheduler']

const KEY = 'atlas_role'
const RoleContext = createContext(null)

function load() {
  try {
    const saved = window.localStorage.getItem(KEY)
    if (ROLES.some((r) => r.id === saved)) return saved
  } catch { /* storage off */ }
  return 'scheduler'
}

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(load)
  const setRole = useCallback((next) => {
    setRoleState(next)
    try { window.localStorage.setItem(KEY, next) } catch { /* storage off */ }
  }, [])
  const value = useMemo(() => ({
    role,
    setRole,
    label: ROLES.find((r) => r.id === role)?.label ?? role,
    canBook: BOOKING_ROLES.includes(role),
    isAdmin: role === 'admin',
  }), [role, setRole])
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export const useRole = () => useContext(RoleContext)
