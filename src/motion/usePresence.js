import { useCallback, useEffect, useState } from 'react'
import { prefersReducedMotion } from './motion.js'

// closed -> open -> closing -> closed (spec section 5). The element stays
// mounted while `closing` and unmounts on its own animationend; a timer backs
// that up in case the event never fires. Under reduced motion it closes at once.
export default function usePresence(open, exitMs) {
  const [state, setState] = useState(open ? 'open' : 'closed')

  useEffect(() => {
    if (open) setState('open')
    else setState((s) => (s === 'closed' || prefersReducedMotion() ? 'closed' : 'closing'))
  }, [open])

  useEffect(() => {
    if (state !== 'closing') return undefined
    const t = setTimeout(() => setState('closed'), exitMs + 80)
    return () => clearTimeout(t)
  }, [state, exitMs])

  const onAnimationEnd = useCallback((e) => {
    if (e.target === e.currentTarget) setState((s) => (s === 'closing' ? 'closed' : s))
  }, [])

  return { mounted: state !== 'closed', state, onAnimationEnd }
}
