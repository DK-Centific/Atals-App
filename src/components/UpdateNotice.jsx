import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { hardRefresh } from '../lib/appRefresh.js'
import { MS } from '../motion/motion.js'
import usePresence from '../motion/usePresence.js'
import { VERSION } from '../version.js'

// "A new version of Atlas is ready", like Twilight's new-build banner. The app reads
// version.json beside the build every 5 minutes and whenever the tab comes back; a
// different version shows this notice until it's acted on. Later hides it for 30
// minutes. The rail's Refresh button gets a dot meanwhile. Offline or a missing file:
// nothing happens.

const CHECK_MS = 5 * 60 * 1000
const SNOOZE_MS = 30 * 60 * 1000
const SNOOZE_KEY = 'atlas_update_later_v1'
const URL = `${import.meta.env.BASE_URL}version.json`

const UpdateContext = createContext({ latest: null })

function snoozedUntil(version) {
  try {
    const s = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? 'null')
    return s?.version === version ? s.until : 0
  } catch { return 0 }
}

export function UpdateProvider({ children }) {
  const [latest, setLatest] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const res = await fetch(`${URL}?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const { version } = await res.json()
        if (alive && typeof version === 'string' && version && version !== VERSION) setLatest(version)
      } catch { /* offline or no version file: try again later */ }
      if (alive) setNow(Date.now())
    }
    const onBack = () => { if (document.visibilityState === 'visible') check() }
    check()
    const timer = setInterval(check, CHECK_MS)
    document.addEventListener('visibilitychange', onBack)
    window.addEventListener('focus', onBack)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onBack)
      window.removeEventListener('focus', onBack)
    }
  }, [])

  const later = useCallback(() => {
    const until = Date.now() + SNOOZE_MS
    try { localStorage.setItem(SNOOZE_KEY, JSON.stringify({ version: latest, until })) } catch { /* shows again on the next check */ }
    setNow(Date.now())
  }, [latest])

  const value = useMemo(() => ({
    latest,
    showing: Boolean(latest) && snoozedUntil(latest) <= now,
    later,
  }), [latest, now, later])
  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
}

export const useUpdate = () => useContext(UpdateContext)

export default function UpdateNotice() {
  const { latest, showing, later } = useUpdate()
  const { mounted, state, onAnimationEnd } = usePresence(showing, MS.exit)
  const [busy, setBusy] = useState(false)
  // Mid-booking (a form or details panel open): refreshing would drop unsaved
  // changes, so it says so and the button asks twice.
  const [editing, setEditing] = useState(false)
  const [sure, setSure] = useState(false)
  useEffect(() => {
    if (!showing) return undefined
    const look = () => setEditing(Boolean(document.querySelector('.atlas-sheet[role="dialog"]')))
    look()
    const t = setInterval(look, 1000)
    return () => clearInterval(t)
  }, [showing])
  useEffect(() => { if (!editing) setSure(false) }, [editing])

  if (!mounted) return null
  const refresh = () => {
    if (editing && !sure) { setSure(true); return }
    setBusy(true)
    hardRefresh()
  }

  return createPortal(
    <div className="atlas-update" data-state={state} role="status" aria-live="polite" onAnimationEnd={onAnimationEnd}>
      <span className="atlas-update-dot" aria-hidden="true" />
      <p className="atlas-update-text">
        <strong>A new version of Atlas is ready</strong>
        <span className="atlas-update-sub">
          {editing
            ? 'Refresh after you save what you’re working on, or changes may be lost.'
            : `You’re on ${VERSION}. Refresh to get ${latest}.`}
        </span>
      </p>
      <div className="atlas-update-actions">
        <button type="button" className="atlas-link atlas-update-later" onClick={later}>Later</button>
        <button type="button" className="atlas-btn-primary atlas-update-refresh" onClick={refresh} disabled={busy}>
          {busy ? 'Refreshing…' : editing && sure ? 'Refresh anyway' : 'Refresh now'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
