import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MS } from '../../motion/motion.js'
import usePresence from '../../motion/usePresence.js'
import useFocusTrap, { returnFocus } from '../../motion/useFocusTrap.js'
import { isPicked, useFilterGroups, useFilters } from '../../state/FilterContext.jsx'
import { CheckIcon, CloseIcon, FilterIcon } from '../Icons.jsx'

// Toolbar filter menu (spec sections 5 and 6). On desktop a glass popover grows
// out of its trigger icon; under 640px the same panel is a bottom sheet with a scrim.
// `before` is an extra section above the groups (the map adds its date range).
export default function FilterMenu({ before = null, beforeLabel = '' }) {
  const { picks, toggle, clearGroup, clearAll } = useFilters()
  const groups = useFilterGroups()
  const [open, setOpen] = useState(false)
  const { mounted, state, onAnimationEnd } = usePresence(open, MS.sheetExit)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const closedByOutside = useRef(false)
  const [pos, setPos] = useState(null)
  const [justOn, setJustOn] = useState(null)
  const count = picks.length

  const close = (outside = false) => {
    closedByOutside.current = outside
    setOpen(false)
  }

  // Focus goes back to the trigger on close, except after a press outside.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open) { wasOpen.current = true; return }
    if (!wasOpen.current) return
    wasOpen.current = false
    if (!closedByOutside.current) returnFocus(triggerRef.current)
  }, [open])

  useLayoutEffect(() => {
    if (!open) return undefined
    const place = () => {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 12, right: Math.max(8, window.innerWidth - r.right) })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') close() }
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      close(true)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  useFocusTrap(panelRef, open && mounted)

  const pick = (group, value) => {
    if (!isPicked(picks, group, value)) setJustOn(`${group}:${value}`)
    toggle(group, value, 'menu')
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`atlas-filter-trigger atlas-icon-btn atlas-raised-sm${count ? ' is-on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="atlas-filter-panel"
        aria-label={count ? `Filters, ${count} on` : 'Filters'}
        title="Filter sessions"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <FilterIcon />
        {count > 0 && <span key={count} className="atlas-filter-badge" aria-hidden="true">{count}</span>}
      </button>

      {mounted && createPortal(
        <div className="atlas-filter-layer" data-state={state}>
          <div className="atlas-filter-scrim" onClick={() => close(true)} />
          <div
            ref={panelRef}
            id="atlas-filter-panel"
            role="dialog"
            aria-label="Filters"
            className="atlas-filter-panel"
            data-state={state}
            style={pos ?? undefined}
            onAnimationEnd={onAnimationEnd}
          >
            <div className="atlas-filter-grab" aria-hidden="true" />
            <div className="atlas-filter-head atlas-filter-row" style={{ animationDelay: '60ms' }}>
              <span className="atlas-filter-title">Filters</span>
              {count > 0 && (
                <button type="button" className="atlas-link atlas-filter-clear" onClick={clearAll}>Clear all</button>
              )}
              <button type="button" className="atlas-filter-close atlas-icon-btn" aria-label="Close filters" onClick={() => close()}>
                <CloseIcon />
              </button>
            </div>

            <div className="atlas-filter-body">
              {before && (
                <section className="atlas-filter-group atlas-filter-row" style={{ animationDelay: `${60 + MS.rowStep / 2}ms` }} aria-label={beforeLabel}>
                  <div className="atlas-filter-group-head">
                    <span className="atlas-eyebrow">{beforeLabel.toUpperCase()}</span>
                  </div>
                  {before}
                </section>
              )}
              {groups.map((g, gi) => {
                const any = picks.some((p) => p.group === g.id)
                return (
                  <section
                    key={g.id}
                    className="atlas-filter-group atlas-filter-row"
                    style={{ animationDelay: `${60 + (gi + 1) * MS.rowStep}ms` }}
                    aria-label={g.label}
                  >
                    <div className="atlas-filter-group-head">
                      <span className="atlas-eyebrow">{g.label.toUpperCase()}</span>
                      {any && (
                        <button type="button" className="atlas-link atlas-filter-clear" onClick={() => clearGroup(g.id)}>Clear</button>
                      )}
                    </div>
                    <div className="atlas-filter-options" role="group" aria-label={`${g.label} (any of)`}>
                      {g.options.map((o) => {
                        const on = isPicked(picks, g.id, o.id)
                        const key = `${g.id}:${o.id}`
                        return (
                          <button
                            key={o.id}
                            type="button"
                            className={`atlas-filter-pill${on ? ' is-on' : ''}${on && justOn === key ? ' is-popping' : ''}`}
                            aria-pressed={on}
                            title={o.title}
                            onClick={() => pick(g.id, o.id)}
                          >
                            {g.id === 'status' && <span className={`atlas-status-dot atlas-status-dot--${o.id}`} />}
                            {o.label}
                            {on && <span className="atlas-filter-check"><CheckIcon /></span>}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
              <p className="atlas-filter-hint atlas-filter-row" style={{ animationDelay: `${60 + 3 * MS.rowStep}ms` }}>
                Picks in one group widen (any of). Groups narrow each other.
              </p>
            </div>

            <button type="button" className="atlas-btn-primary atlas-btn-primary--compact atlas-filter-done" onClick={() => close()}>
              Done
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
