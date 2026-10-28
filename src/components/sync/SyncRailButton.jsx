import { useSync } from '../../state/SyncContext.tsx'

// Rail button for the OneForma sync sheet. The badge counts events that need a person.
export default function SyncRailButton() {
  const { attention, dryRun, setOpen } = useSync()
  const label = `OneForma sync${dryRun ? ' (dry run)' : ''}${attention ? `, ${attention} need attention` : ''}`
  return (
    <button type="button" className="atlas-rail-item atlas-sync-rail" title={label} aria-label={label} onClick={() => setOpen(true)}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 7h13l-3-3M20 17H7l3 3" />
      </svg>
      {attention > 0 && <span key={attention} className="atlas-sync-rail-badge atlas-status-line">{attention}</span>}
    </button>
  )
}
