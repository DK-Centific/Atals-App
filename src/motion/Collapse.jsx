import { useEffect, useRef } from 'react'

// Collapse / expand by grid-template-rows 0fr -> 1fr plus opacity (300ms).
// Closed content is inert so it can't be tabbed into.
export default function Collapse({ open, id, children }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.inert = !open }, [open])
  return (
    <div ref={ref} id={id} className={`atlas-collapse${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <div className="atlas-collapse-inner">{children}</div>
    </div>
  )
}
