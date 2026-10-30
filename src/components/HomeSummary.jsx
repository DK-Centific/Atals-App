import { homeLabel, homeStories } from '../lib/home.js'

// A participant's home in a line: a small house (one or two stories), the type and
// size. `features` adds the selected features underneath. Used where Protocol was.
export function HomeGlyph({ stories = 1 }) {
  return stories === 2 ? (
    <svg className="atlas-home-glyph" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5 14 6v8.5H2V6z" />
      <path d="M2.5 9.5h11M6.5 12h3v2.5h-3z" />
    </svg>
  ) : (
    <svg className="atlas-home-glyph" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 4 14.5 9v5.5h-13V9z" />
      <path d="M6.5 11.5h3v3h-3z" />
    </svg>
  )
}

export default function HomeSummary({ home, features = false }) {
  if (!home?.type && !home?.size) return <span className="atlas-detail-muted">No home answers yet</span>
  return (
    <span className="atlas-home-summary-line">
      <span className="atlas-home-summary-main">
        {home.type && <HomeGlyph stories={homeStories(home.type)} />}
        {[home.type && homeLabel(home.type), home.size].filter(Boolean).join(' · ')}
      </span>
      {features && home.features?.length > 0 && <span className="atlas-home-summary-features">{home.features.join(', ')}</span>}
    </span>
  )
}
