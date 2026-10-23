import { useState } from 'react'

// Motion tokens in JS, matching :root in index.css (ux-behavior-spec.md section 1).
export const MS = {
  press: 150,
  exit: 180,
  viewEnter: 240,
  sheetExit: 200,
  menuExit: 120,
  rowStep: 35,
  countUp: 900,
  toast: 6000,
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Exit timers wait 0ms under reduced motion (spec section 9).
export const exitMs = (ms) => (prefersReducedMotion() ? 0 : ms)

// Keyboard + pointer props for a clickable non-button element.
export const pressProps = (onActivate, label) => ({
  role: 'button',
  tabIndex: 0,
  'aria-label': label,
  onClick: onActivate,
  onKeyDown: (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate?.(e)
    }
  },
})

// Row-enter delays fixed at first render (35ms steps, capped).
// Items added later get no delay, so they fade up into place at once.
export function useStagger(ids, stepMs = MS.rowStep, maxSteps = 8) {
  const [initial] = useState(() => new Map(ids.map((id, i) => [id, i])))
  return (id) => {
    const i = initial.get(id)
    return { animationDelay: `${i === undefined ? 0 : Math.min(i, maxSteps) * stepMs}ms` }
  }
}
