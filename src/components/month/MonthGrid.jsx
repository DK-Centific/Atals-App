import { TODAY } from '../../data/schedule.js'
import { longDayLabel } from '../../lib/dates.js'
import { pressProps } from '../../motion/motion.js'

const DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const CHIP_CLASS = {
  completed: 'atlas-month-chip atlas-month-chip--completed',
  cancelled: 'atlas-month-chip atlas-month-chip--cancelled',
  insession: 'atlas-month-chip atlas-month-chip--insession',
  booked: 'atlas-month-chip atlas-month-chip--booked',
}

// Month calendar. `cells` come from monthGrid(); `chipsFor(date)` gives the status markers.
// The grid re-keys on month change so it slides in from the side it came from.
export default function MonthGrid({ cells, chipsFor, selected, onSelect, slide, firstRender }) {
  return (
    <section className="atlas-month">
      <div className="atlas-month-weekdays">
        {DOW.map((d) => <div key={d} className="atlas-eyebrow atlas-month-weekday">{d}</div>)}
      </div>
      <div key={slide.key} className={`atlas-month-grid${slide.dir ? ` atlas-slide-${slide.dir}` : ''}`}>
        {cells.map((c, i) => {
          const today = c.date === TODAY
          const chips = chipsFor(c.date)
          return (
            <div
              key={c.date}
              className={`atlas-month-day${c.other ? ' is-other-month' : ''}${today ? ' is-today' : ''}${selected === c.date && !today ? ' is-selected' : ''}${firstRender ? ' atlas-rise' : ''}`}
              style={firstRender ? { animationDelay: `${Math.floor(i / 7) * 50 + (i % 7) * 15}ms` } : undefined}
              aria-pressed={selected === c.date}
              {...pressProps(() => onSelect(c.date), `${longDayLabel(c.date)}, ${chips.length} sessions`)}
            >
              <span className="atlas-month-day-num">{c.day}</span>
              {chips.map((status, j) => <div key={j} className={CHIP_CLASS[status]} />)}
            </div>
          )
        })}
      </div>
    </section>
  )
}
