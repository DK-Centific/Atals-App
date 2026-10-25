import { createContext, useCallback, useContext, useDeferredValue, useMemo, useState } from 'react'
import { matches } from '../lib/filters.js'

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

export const isPicked = (picks, group, value) => picks.some((p) => p.group === group && p.value === value)

// Pills update at once; pages recompute from a deferred copy so a heavy
// re-filter never holds up the pill.
export function useFilteredPicks() {
  const { picks } = useFilters()
  return useDeferredValue(picks)
}

export function useMatches() {
  const picks = useFilteredPicks()
  return useCallback((item) => matches(picks, item), [picks])
}
