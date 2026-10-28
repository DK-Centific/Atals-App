import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LOCAL_AUTH, listModerators } from '../lib/auth/api.ts'
import { SEED_MODERATORS, firstName } from '../data/moderators.js'
import { DEMO } from '../lib/oneforma/config.ts'
import { useAuth } from './AuthContext.tsx'

// Who can be booked: the active Moderator accounts (Admin > Users), so adding a
// moderator there makes them bookable. On localhost the seed list stands in until
// the stand-in answers; against the real Auth flow nothing is assumed.
const ModeratorContext = createContext(null)

const byName = (a, b) => firstName(a).localeCompare(firstName(b))

export function ModeratorProvider({ children }) {
  const { token } = useAuth()
  // Demo data uses the sample moderators the sample sessions are booked with.
  const [moderators, setModerators] = useState(() => (LOCAL_AUTH || DEMO ? [...SEED_MODERATORS].sort(byName) : []))

  const refresh = useCallback(async () => {
    if (!token || DEMO) return
    try {
      const list = await listModerators(token)
      setModerators([...list].sort(byName))
    } catch {
      // Keep what we have.
    }
  }, [token])

  useEffect(() => { refresh() }, [refresh])

  const value = useMemo(() => {
    const index = new Map(moderators.map((m) => [m.email, m]))
    // Sessions may name someone no longer listed (turned off, renamed): fall back to their email.
    const name = (email) => (index.has(email) ? firstName(index.get(email)) : (email?.split('@')[0] ?? ''))
    const fullName = (email) => index.get(email)?.displayName ?? email ?? ''
    // For cards and lists: who it is, or that an Admin still has to assign someone.
    const label = (email) => (email ? name(email) : 'Needs moderator')
    return { moderators, name, fullName, label, refresh }
  }, [moderators, refresh])

  return <ModeratorContext.Provider value={value}>{children}</ModeratorContext.Provider>
}

export const useModerators = () => useContext(ModeratorContext)
