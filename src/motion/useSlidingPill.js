import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// One highlight pill behind the active option of a segmented control. It slides
// to the new option (350ms --ease-slide); on first paint it just appears.
// The active option carries data-pill-active="true".
export default function useSlidingPill(activeKey) {
  const trackRef = useRef(null)
  const [box, setBox] = useState(null)
  const [animate, setAnimate] = useState(false)

  const measure = useCallback(() => {
    const el = trackRef.current?.querySelector('[data-pill-active="true"]')
    setBox(el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null)
  }, [])

  useLayoutEffect(measure, [activeKey, measure])

  useEffect(() => {
    const el = trackRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  // Turn the transition on only after the pill has painted in place once.
  useEffect(() => {
    if (!box || animate) return undefined
    const raf = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(raf)
  }, [box, animate])

  const pillProps = {
    'aria-hidden': true,
    className: `atlas-pill${animate ? ' is-animated' : ''}`,
    style: box
      ? { transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }
      : { opacity: 0 },
  }
  return { trackRef, pillProps }
}
