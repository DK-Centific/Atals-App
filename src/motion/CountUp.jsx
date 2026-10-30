import { useEffect, useRef, useState } from 'react'
import { MS, prefersReducedMotion } from './motion.js'

const ease = (t) => 1 - (1 - t) ** 3

// Headline number: counts from 0 the first time, then from the last shown value.
// Starts when scrolled into view. Screen readers get the final value only.
export default function CountUp({ value, className = '' }) {
  const ref = useRef(null)
  const shown = useRef(0)
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0))
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return undefined
    const from = shown.current
    if (prefersReducedMotion() || from === value) {
      shown.current = value
      setDisplay(value)
      return undefined
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (now) => {
      // A frame can be stamped just before t0; clamp so it never counts below the start.
      const t = Math.min(1, Math.max(0, (now - t0) / MS.countUp))
      const v = Math.round(from + (value - from) * ease(t))
      shown.current = v
      setDisplay(v)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, visible])

  return (
    <span ref={ref} className={`atlas-count ${className}`}>
      <span aria-hidden="true">{display.toLocaleString()}</span>
      <span className="atlas-sr-only">{value.toLocaleString()}</span>
    </span>
  )
}
