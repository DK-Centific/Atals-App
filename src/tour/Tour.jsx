import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MS, prefersReducedMotion } from '../motion/motion.js'
import usePresence from '../motion/usePresence.js'
import useFocusTrap, { returnFocus } from '../motion/useFocusTrap.js'
import { useTour } from './TourContext.jsx'

// The tour on screen: the page dims, a spotlight with a soft pulsing ring sits on
// the step's target, and a glass bubble explains it. Under 640px the bubble is a
// bottom sheet. Arrow keys move, Esc skips; the page underneath can't be clicked.

const PAD = 8 // spotlight around the target
const GAP = 14 // spotlight to bubble
const EDGE = 12 // bubble to the window edge
const PHONE = 640

/** The step's target if it's on screen for this person (not hidden, not inert). */
function findTarget(name) {
  if (!name) return null
  for (const el of document.querySelectorAll(`[data-tour="${name}"]`)) {
    if (el.closest('[inert]')) continue
    const r = el.getBoundingClientRect()
    if (r.width && r.height && getComputedStyle(el).visibility !== 'hidden') return el
  }
  return null
}

// Below the target if it fits, else above, right, left; always inside the window.
function place(rect, bw, bh, vw, vh) {
  const clampX = (x) => Math.min(Math.max(x, EDGE), vw - bw - EDGE)
  const clampY = (y) => Math.min(Math.max(y, EDGE), vh - bh - EDGE)
  if (!rect) return { left: clampX((vw - bw) / 2), top: clampY((vh - bh) / 2) }
  const midX = rect.left + rect.width / 2 - bw / 2
  const midY = rect.top + rect.height / 2 - bh / 2
  const fits = {
    bottom: vh - rect.bottom - PAD - GAP >= bh + EDGE,
    top: rect.top - PAD - GAP >= bh + EDGE,
    right: vw - rect.right - PAD - GAP >= bw + EDGE,
    left: rect.left - PAD - GAP >= bw + EDGE,
  }
  if (fits.bottom) return { left: clampX(midX), top: rect.bottom + PAD + GAP }
  if (fits.top) return { left: clampX(midX), top: rect.top - PAD - GAP - bh }
  if (fits.right) return { left: rect.right + PAD + GAP, top: clampY(midY) }
  if (fits.left) return { left: rect.left - PAD - GAP - bw, top: clampY(midY) }
  // A target taller than the window: keep the bubble in its lower corner.
  return { left: clampX(rect.right - bw), top: clampY(vh - bh - EDGE) }
}

const same = (a, b) => a && b && Object.keys(a).every((k) => Math.abs(a[k] - b[k]) < 0.5)

export default function Tour() {
  const { run, finish, skip } = useTour()
  const open = Boolean(run)
  const { mounted, state, onAnimationEnd } = usePresence(open, MS.exit)
  const last = useRef(run)
  if (run) last.current = run
  const current = run ?? last.current

  // The steps this person can see right now, worked out once the tour starts.
  const [list, setList] = useState([])
  const [index, setIndex] = useState(0)
  const [moving, setMoving] = useState(false)
  const opener = useRef(null)
  useEffect(() => {
    if (!run) return
    setIndex(0)
    setList(run.steps.filter((s) => !s.target || findTarget(s.target)))
  }, [run])
  useEffect(() => {
    if (open) opener.current = document.activeElement
    else returnFocus(opener.current)
  }, [open])

  const step = list[index]
  const isLast = index === list.length - 1
  const next = useCallback(() => (isLast ? finish() : setIndex((i) => i + 1)), [isLast, finish])
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  // Nothing to show for this person (every target hidden): count it as seen.
  useEffect(() => {
    if (run && list.length === 0 && run.steps.every((s) => s.target && !findTarget(s.target))) finish()
  }, [run, list, finish])

  // Bring the target into view, then let the spotlight and bubble glide to it.
  useEffect(() => {
    if (!step) return undefined
    const el = findTarget(step.target)
    if (el) {
      const r = el.getBoundingClientRect()
      const out = r.top < 0 || r.left < 0 || r.bottom > window.innerHeight || r.right > window.innerWidth
      if (out) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
    setMoving(true)
    const t = setTimeout(() => setMoving(false), 420)
    return () => clearTimeout(t)
  }, [step])

  // Follow the target every frame: scrolling, resizing and panels opening all move it.
  const bubbleRef = useRef(null)
  const [geo, setGeo] = useState(null)
  useLayoutEffect(() => {
    if (!step || state === 'closing') return undefined
    let raf = 0
    const tick = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const el = findTarget(step.target)
      const r = el?.getBoundingClientRect() ?? null
      const b = bubbleRef.current
      const phone = vw < PHONE
      // A target taller or wider than the window is lit only where it's on screen.
      const box = r && {
        left: Math.max(r.left, PAD), top: Math.max(r.top, PAD),
        right: Math.min(r.right, vw - PAD), bottom: Math.min(r.bottom, vh - PAD),
      }
      if (box) { box.width = box.right - box.left; box.height = box.bottom - box.top }
      const spot = box
        ? { x: box.left - PAD, y: box.top - PAD, w: box.width + PAD * 2, h: box.height + PAD * 2 }
        : { x: vw / 2, y: vh / 2, w: 0, h: 0 }
      const pos = phone || !b ? { left: 0, top: 0 } : place(box, b.offsetWidth, b.offsetHeight, vw, vh)
      const nextGeo = { ...spot, left: pos.left, top: pos.top, phone: phone ? 1 : 0, none: r ? 0 : 1 }
      setGeo((g) => (same(g, nextGeo) ? g : nextGeo))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [step, state])

  // Keys: arrows move, Esc skips. Caught first, so nothing underneath reacts too.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); skip() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, next, back, skip])

  // Focus lands on Next (or Done) each step, so Enter moves on.
  const nextRef = useRef(null)
  useEffect(() => { if (step && open) nextRef.current?.focus({ preventScroll: true }) }, [step, open])
  useFocusTrap(bubbleRef, open && Boolean(step), { autoFocus: false })

  if (!mounted || !current) return null
  const phone = geo?.phone === 1

  return createPortal(
    <div className={`atlas-tour${moving ? ' is-moving' : ''}`} data-state={state} onAnimationEnd={onAnimationEnd}>
      <div className="atlas-tour-block" aria-hidden="true" />
      {geo && (
        <div
          className={`atlas-tour-spot${geo.none ? ' is-none' : ''}`}
          aria-hidden="true"
          style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h }}
        />
      )}
      {step && (
        <div
          ref={bubbleRef}
          className={`atlas-tour-bubble${phone ? ' is-sheet' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="atlas-tour-title"
          aria-describedby="atlas-tour-body"
          style={phone || !geo ? undefined : { left: geo.left, top: geo.top }}
        >
          <div key={`${current.id}-${index}`} className="atlas-tour-content atlas-swap-in">
            <h2 id="atlas-tour-title" className="atlas-tour-title">{step.title}</h2>
            <p id="atlas-tour-body" className="atlas-tour-body">{step.body}</p>
          </div>
          <div className="atlas-tour-foot">
            {list.length > 1 && (
              <span className="atlas-tour-count" aria-label={`Step ${index + 1} of ${list.length}`}>
                <span className="atlas-tour-dots" aria-hidden="true">
                  {list.map((s, i) => <span key={`${s.target}-${i}`} className={`atlas-tour-dot${i === index ? ' is-on' : ''}`} />)}
                </span>
                <span aria-hidden="true">{index + 1} of {list.length}</span>
              </span>
            )}
            <div className="atlas-tour-actions">
              {!isLast && <button type="button" className="atlas-link atlas-tour-skip" onClick={skip}>Skip tour</button>}
              {index > 0 && <button type="button" className="atlas-btn-ghost atlas-tour-back" onClick={back}>Back</button>}
              <button ref={nextRef} type="button" className="atlas-btn-primary atlas-btn-primary--compact atlas-tour-next" onClick={next}>
                {isLast ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
