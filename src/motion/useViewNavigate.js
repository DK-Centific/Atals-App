import { useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MS, prefersReducedMotion } from './motion.js'

// Navigate between views: the current view fades out fast (180ms, --ease-exit),
// then the next one enters with .atlas-view-enter (240ms) on mount.
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
    content.classList.add('atlas-view-leave')
    setTimeout(() => {
      pending.current = false
      navigate(to)
    }, MS.exit)
  }, [navigate, pathname])
}
