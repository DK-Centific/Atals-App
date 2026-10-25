import { useCallback, useEffect, useRef, useState } from 'react'
import { MS } from './motion.js'

// Auto-close after 6s. The timer pauses while the pointer is over the
// notification or focus is inside it, and restarts from a full 6s after.
// `key` changes when a new message arrives, so it gets its full time too.
export default function useAutoDismiss(onDismiss, key, ms = MS.toast) {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const cb = useRef(onDismiss)
  cb.current = onDismiss

  useEffect(() => {
    if (key == null || hover || focus) return undefined
    const t = setTimeout(() => cb.current(), ms)
    return () => clearTimeout(t)
  }, [key, hover, focus, ms])

  return {
    onMouseEnter: useCallback(() => setHover(true), []),
    onMouseLeave: useCallback(() => setHover(false), []),
    onFocus: useCallback(() => setFocus(true), []),
    onBlur: useCallback((e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false) }, []),
  }
}
