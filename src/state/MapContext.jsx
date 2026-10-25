import { createContext, useCallback, useContext, useMemo, useState } from 'react'

// Map state shared by the Map view and the app-wide right-click menu, so a
// name picked from the menu moves the map.
// layers: which dot colours show. Completed is off until switched on.
// focus: what the map should travel to: { kind: 'participant' | 'team', id, key }.
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
  const [selected, setSelected] = useState(null)
  // App-wide right-click menu: { x, y } or null.
  const [appMenu, setAppMenu] = useState(null)

  const toggleLayer = useCallback((id) => setLayers((l) => ({ ...l, [id]: !l[id] })), [])
  const focusParticipant = useCallback((id) => {
    setSelected(id)
    setFocus({ kind: 'participant', id, key: Date.now() })
  }, [])
  const focusTeam = useCallback((id) => setFocus({ kind: 'team', id, key: Date.now() }), [])
  const clearFocus = useCallback(() => { setFocus(null); setSelected(null) }, [])

  const value = useMemo(() => ({
    layers, toggleLayer, focus, focusParticipant, focusTeam, clearFocus, selected, setSelected,
    appMenu, openAppMenu: setAppMenu, closeAppMenu: () => setAppMenu(null),
  }), [layers, toggleLayer, focus, focusParticipant, focusTeam, clearFocus, selected, appMenu])
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export const useMap = () => useContext(MapContext)
