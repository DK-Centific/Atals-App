import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { participantMiles } from '../../lib/geo.js'
import { formatDrive } from '../../lib/routing.js'
import { MS } from '../../motion/motion.js'
import usePresence from '../../motion/usePresence.js'
import useFocusTrap from '../../motion/useFocusTrap.js'
import BookingPanel from '../day/BookingPanel.jsx'

// New Booking over the map: the Day view's booking form in a sheet (right side
// on desktop, bottom sheet on a phone), filled from the person picked on the
// map, so booking never leaves the map. `trip` is their drive from HQ, if routed.
export default function MapBookingSheet({ participant, trip, onClose, onBooked }) {
  const open = Boolean(participant)
  const { mounted, state, onAnimationEnd } = usePresence(open, MS.sheetExit)
  const sheetRef = useRef(null)
  const shown = useRef(participant)
  if (participant) shown.current = participant
  const p = shown.current

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useFocusTrap(sheetRef, open && mounted)

  if (!mounted || !p) return null
  const drive = trip && trip !== 'loading' ? ` · ${formatDrive(trip.minutes)} drive` : ''

  return createPortal(
    <div className="atlas-sheet-layer atlas-sheet-layer--map" data-state={state}>
      <div className="atlas-sheet-scrim" onClick={onClose} />
      <div
        ref={sheetRef}
        className="atlas-sheet atlas-raised"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label={`New booking for ${p.name}`}
        onAnimationEnd={onAnimationEnd}
      >
        <div className="atlas-sheet-grab" aria-hidden="true" />
        <header className="atlas-sheet-head">
          <div className="atlas-sheet-head-text">
            <span className="atlas-eyebrow atlas-map-booking-eyebrow">NEW BOOKING · {p.id}</span>
            <h2 className="atlas-sheet-title">{p.name}</h2>
            <div className="atlas-sheet-sub">{p.address.split(',')[0]} · {participantMiles(p)} from HQ{drive}</div>
          </div>
          <button type="button" className="atlas-sheet-close atlas-icon-btn atlas-raised-sm" aria-label="Close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>
        <BookingPanel key={p.id} participant={p} onBooked={onBooked} />
      </div>
    </div>,
    document.body,
  )
}
