import { useEffect } from 'react'

const FOCUSABLE = ':is(button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]):not([tabindex="-1"])'

// While active: move focus into the container on the next frame (unless
// `initialFocus` already did), and keep Tab inside it.
export default function useFocusTrap(ref, active, { autoFocus = true } = {}) {
  useEffect(() => {
    if (!active) return undefined
    const el = ref.current
    if (!el) return undefined
    const raf = autoFocus
      ? requestAnimationFrame(() => {
        if (!el.contains(document.activeElement)) el.querySelector(FOCUSABLE)?.focus({ preventScroll: true })
      })
      : 0
    const onKey = (e) => {
      if (e.key !== 'Tab') return
      const items = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null && !n.closest('[inert]'))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    el.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(raf); el.removeEventListener('keydown', onKey) }
  }, [ref, active, autoFocus])
}

// Return focus to what opened something, if it is still on the page.
export const returnFocus = (el) => {
  if (el && el.isConnected) el.focus({ preventScroll: true })
}
