import { createContext, useContext, useEffect, useMemo } from 'react'
import { setAppIdentity } from '../lib/appInstall.js'
import { useAuth } from './AuthContext.tsx'

// What the signed-in person may do, from their role. The flows check the same
// rules on their side; hiding a screen here only keeps the app tidy.
// Moderator: Checklist. Scheduler: Booking. Admin: Booking, Users and Checklist.
export const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'moderator', label: 'Moderator' },
]
export const BOOKING_ROLES = ['admin', 'scheduler']

/** Where each role lands after sign-in (one URL, different first screen). */
export const LANDING = { admin: '/day', scheduler: '/day', moderator: '/checklist' }

const RoleContext = createContext(null)

export function RoleProvider({ children }) {
  const { user } = useAuth()
  const role = user?.role ?? null
  const email = user?.email ?? null
  // The installable app's name and icon follow the role: "Atlas Admin" for Admins, "Atlas" otherwise.
  useEffect(() => { setAppIdentity(role === 'admin') }, [role])
  const value = useMemo(() => ({
    role,
    label: ROLES.find((r) => r.id === role)?.label ?? '',
    email,
    canBook: BOOKING_ROLES.includes(role),
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    landing: LANDING[role] ?? '/',
  }), [role, email])
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export const useRole = () => useContext(RoleContext)
