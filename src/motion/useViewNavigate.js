import { useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { prefersReducedMotion } from './motion.js'

const LEAVE_MS = 220 // Twilight's station-leave duration

// Navigate between views the way Twilight changes pages: the current view
// fades down and out, then the next view rises in (.atlas-page-enter on mount).
export default function useViewNavigate() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pending = useRef(false)

  return useCallback((to) => {
    if (to === pathname || pending.current) return
    const content = document.querySelector('[data-view-content]')
    if (!content || prefersReducedMotion()) {
      navigate(to)
      return
    }
    pending.current = true
    content.classList.add('atlas-page-leave')
    setTimeout(() => {
      pending.current = false
      navigate(to)
    }, LEAVE_MS)
  }, [navigate, pathname])
}
