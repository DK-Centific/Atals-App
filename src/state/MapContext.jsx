import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { rangeFor } from '../lib/dateRange.js'

// Map state shared by the Map view and the app-wide right-click menu, so a
// name picked from the menu moves the map.
// layers: which dot colours show. Completed is off until switched on.
// focus: what the map should travel to: { kind: 'participant' | 'moderator', id, key }.
// range: which booking dates show ({ preset, from, to }), Today to start.
// rangeBarHidden: the top date bar was put away; it then only peeks.
const MapContext = createContext(null)

export const MAP_LAYERS = [
  { id: 'open', label: 'Open to book' },
  { id: 'booked', label: 'Booked' },
  { id: 'insession', label: 'In session' },
  { id: 'completed', label: 'Completed' },
]

export function MapProvider({ children }) {
  const [layers, setLayers] = useState({ open: true, booked: true, insession: true, completed: false })
  const [focus, setFocus] = useState(null)
  const [range, setRange] = useState(() => ({ preset: 'today', ...rangeFor('today') }))
  const [rangeBarHidden, setRangeBarHidden] = useState(false)
  const [selected, setSelected] = useState(null)
  // App-wide right-click menu: { x, y } or null.
  const [appMenu, setAppMenu] = useState(null)

  const toggleLayer = useCallback((id) => setLayers((l) => ({ ...l, [id]: !l[id] })), [])
  const focusParticipant = useCallback((id) => {
    setSelected(id)
    setFocus({ kind: 'participant', id, key: Date.now() })
  }, [])
  const focusModerator = useCallback((email) => setFocus({ kind: 'moderator', id: email, key: Date.now() }), [])
  const clearFocus = useCallback(() => { setFocus(null); setSelected(null) }, [])

  const value = useMemo(() => ({
    layers, toggleLayer, focus, focusParticipant, focusModerator, clearFocus, selected, setSelected,
    range, setRange, rangeBarHidden, setRangeBarHidden,
    appMenu, openAppMenu: setAppMenu, closeAppMenu: () => setAppMenu(null),
  }), [layers, toggleLayer, focus, focusParticipant, focusModerator, clearFocus, selected, range, rangeBarHidden, appMenu])
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export const useMap = () => useContext(MapContext)
