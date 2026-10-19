import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import useViewNavigate from '../motion/useViewNavigate.js'
import { pressProps } from '../motion/motion.js'

const VIEWS = [
  { path: '/day', label: 'DAY' },
  { path: '/week', label: 'WEEK' },
  { path: '/month', label: 'MONTH' },
]

// Day / Week / Month switcher. The pressed pill takes the active state at once,
// then the page transitions to its view.
// tone="recessed" is the Month header's darker track; wideLabels matches Day/Week letter spacing.
export default function ViewToggle({ tone = 'surface', wideLabels = true }) {
  const { pathname } = useLocation()
  const goTo = useViewNavigate()
  const [pending, setPending] = useState(null)
  const current = pending ?? pathname

  return (
    <div className={`atlas-view-switch${tone === 'recessed' ? ' atlas-view-switch--recessed' : ''}`} role="tablist" aria-label="Calendar view">
      {VIEWS.map(({ path, label }) => (
        <div
          key={path}
          className={`atlas-view-tab${current === path ? ' is-active' : ''}`}
          aria-selected={current === path}
          {...pressProps(() => {
            if (path === pathname) return
            setPending(path)
            goTo(path)
          }, `${label.toLowerCase()} view`)}
          role="tab"
        >
          <div className="atlas-view-tab-dot" />
          <span className={`atlas-eyebrow atlas-view-tab-label${wideLabels ? ' atlas-view-tab-label--wide' : ''}`}>{label}</span>
        </div>
      ))}
    </div>
  )
}
