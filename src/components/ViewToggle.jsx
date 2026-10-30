import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import useViewNavigate from '../motion/useViewNavigate.js'
import useSlidingPill from '../motion/useSlidingPill.js'

const TONE_CLASS = {
  recessed: ' atlas-view-switch--recessed',
  dock: ' atlas-view-switch--dock',
}

const VIEWS = [
  { path: '/day', label: 'Day' },
  { path: '/week', label: 'Week' },
  { path: '/month', label: 'Month' },
]

// Day / Week / Month switcher: a segmented control whose highlight pill slides
// to the pressed option at once, then the page transitions to that view.
// tone="recessed" is the Month header's darker track, tone="dock" the Day view's
// floating glass dock.
export default function ViewToggle({ tone = 'surface' }) {
  const { pathname } = useLocation()
  const goTo = useViewNavigate()
  const [pending, setPending] = useState(null)
  const current = pending ?? `/${pathname.split('/')[1]}`
  const { trackRef, pillProps } = useSlidingPill(current)

  return (
    <div
      ref={trackRef}
      className={`atlas-view-switch${TONE_CLASS[tone] ?? ''}`}
      role="group"
      aria-label="Calendar view"
    >
      <div {...pillProps} className={`${pillProps.className} atlas-view-pill`} />
      {VIEWS.map(({ path, label }) => {
        const on = current === path
        return (
          <button
            key={path}
            type="button"
            className={`atlas-view-tab${on ? ' is-active' : ''}`}
            data-pill-active={on}
            aria-pressed={on}
            aria-label={`${label} view`}
            onClick={() => {
              if (pathname === path || pathname.startsWith(`${path}/`)) return
              setPending(path)
              goTo(path)
            }}
          >
            <span className="atlas-view-tab-dot" />
            <span className="atlas-view-tab-label">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
