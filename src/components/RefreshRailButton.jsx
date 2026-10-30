import { useState } from 'react'
import { hardRefresh } from '../lib/appRefresh.js'
import { VERSION } from '../version.js'
import { useUpdate } from './UpdateNotice.jsx'

// Rail button that loads the newest Atlas (lib/appRefresh.js). A dot shows while
// a newer version is live.
export default function RefreshRailButton() {
  const [busy, setBusy] = useState(false)
  const { latest } = useUpdate()
  const refresh = () => {
    if (busy) return
    setBusy(true)
    hardRefresh()
  }
  const label = latest
    ? `Refresh Atlas: ${latest} is ready (you’re on ${VERSION})`
    : `Refresh Atlas (on ${VERSION}; loads the latest version)`
  return (
    <button
      type="button"
      className={`atlas-rail-item atlas-refresh-rail${busy ? ' is-busy' : ''}`}
      data-tour="refresh"
      title={label}
      aria-label={label}
      aria-busy={busy}
      onClick={refresh}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5" />
      </svg>
      {latest && <span className="atlas-refresh-dot" aria-hidden="true" />}
    </button>
  )
}
