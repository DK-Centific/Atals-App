import { useTour } from './TourContext.jsx'

// "Tour" in a page header: replays the short tour for the page you're on.
export default function TourButton({ className = '' }) {
  const { replayPage, canReplayPage } = useTour()
  if (!canReplayPage) return null
  return (
    <button
      type="button"
      className={`atlas-tour-btn atlas-raised-sm${className ? ` ${className}` : ''}`}
      data-tour="tour-button"
      title="A short walk through this page"
      onClick={replayPage}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4" />
        <line x1="12" y1="17" x2="12" y2="17.01" />
      </svg>
      Tour
    </button>
  )
}
