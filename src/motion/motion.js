import { useState } from 'react'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

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

// Stagger delays fixed at first render, like Twilight's one-shot tile stagger.
// Items added later get no delay, so they rise in immediately.
export function useStagger(ids, stepMs = 60, maxSteps = 8) {
  const [initial] = useState(() => new Map(ids.map((id, i) => [id, i])))
  return (id) => {
    const i = initial.get(id)
    return { animationDelay: `${i === undefined ? 0 : Math.min(i, maxSteps) * stepMs}ms` }
  }
}
