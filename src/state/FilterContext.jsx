import { createContext, useCallback, useContext, useDeferredValue, useMemo, useState } from 'react'
import { filterGroups, matches } from '../lib/filters.js'
import { homeKey } from '../lib/home.js'
import { useModerators } from './ModeratorContext.jsx'
import { useParticipants } from './ParticipantContext.jsx'

// One filter state for the page session, shared by Day, Week and Month. The
// filter menu and the status legend read and write the same picks; each pick
// remembers where it came from ('menu' or 'legend').
const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [picks, setPicks] = useState([])

  const toggle = useCallback((group, value, from = 'menu') => {
    setPicks((prev) => (prev.some((p) => p.group === group && p.value === value)
      ? prev.filter((p) => !(p.group === group && p.value === value))
      : [...prev, { group, value, from }]))
  }, [])
  const clearGroup = useCallback((group) => setPicks((prev) => prev.filter((p) => p.group !== group)), [])
  const clearAll = useCallback(() => setPicks([]), [])

  const value = useMemo(() => ({ picks, toggle, clearGroup, clearAll }), [picks, toggle, clearGroup, clearAll])
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export const useFilters = () => useContext(FilterContext)

/** Status and Moderator groups, the moderator options from the active moderators. */
export function useFilterGroups() {
  const { moderators } = useModerators()
  return useMemo(() => filterGroups(moderators), [moderators])
}

export const isPicked = (picks, group, value) => picks.some((p) => p.group === group && p.value === value)

// Pills update at once; pages recompute from a deferred copy so a heavy
// re-filter never holds up the pill.
export function useFilteredPicks() {
  const { picks } = useFilters()
  return useDeferredValue(picks)
}

/** A session's home-type key, from its participant's OneForma answer (null: no answer). */
export function useHomeOf() {
  const { participants } = useParticipants()
  return useMemo(() => {
    const byId = new Map(participants.map((p) => [p.id, homeKey(p.home?.type)]))
    return (item) => (item.participantId ? byId.get(item.participantId) ?? null : undefined)
  }, [participants])
}

export function useMatches() {
  const picks = useFilteredPicks()
  const homeOf = useHomeOf()
  return useCallback((item) => matches(picks, { ...item, home: homeOf(item) }), [picks, homeOf])
}
