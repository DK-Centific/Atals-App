import { useState } from 'react'

// Rail button that loads the newest Atlas: refetches the page past the browser
// cache, checks for a new service worker, then reloads. Sign-in and saved data stay.
export default function RefreshRailButton() {
  const [busy, setBusy] = useState(false)
  const refresh = async () => {
    if (busy) return
    setBusy(true)
    try {
      await Promise.allSettled([
        fetch(window.location.href, { cache: 'reload' }),
        navigator.serviceWorker?.getRegistration().then((r) => r?.update()),
        window.caches?.keys().then((keys) => Promise.all(keys.map((k) => window.caches.delete(k)))),
      ])
    } finally {
      window.location.reload()
    }
  }
  const label = 'Refresh Atlas (load the latest version)'
  return (
    <button
      type="button"
      className={`atlas-rail-item atlas-refresh-rail${busy ? ' is-busy' : ''}`}
      title={label}
      aria-label={label}
      aria-busy={busy}
      onClick={refresh}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5" />
      </svg>
    </button>
  )
}
