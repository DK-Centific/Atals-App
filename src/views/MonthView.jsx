import { useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import StatusLegend from '../components/StatusLegend.jsx'
import TodaySummary from '../components/month/TodaySummary.jsx'
import MonthGrid from '../components/month/MonthGrid.jsx'
import { HISTORY, TODAY } from '../data/schedule.js'
import { monthGrid, monthTitle, parse } from '../lib/dates.js'
import useViewNavigate from '../motion/useViewNavigate.js'
import { sessionsOn, useSchedule } from '../state/ScheduleContext.jsx'

export default function MonthView() {
  const { sessions, openDay } = useSchedule()
  const goTo = useViewNavigate()
  const t = parse(TODAY)
  const [ym, setYm] = useState({ y: t.getUTCFullYear(), m: t.getUTCMonth() })
  const [slide, setSlide] = useState({ dir: null, key: 0 })
  const [selected, setSelected] = useState(null)

  const shift = (dir) => {
    setYm(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + dir, 1))
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() }
    })
    setSlide((s) => ({ dir: dir > 0 ? 'next' : 'prev', key: s.key + 1 }))
  }

  // Seeded history plus live sessions (cancelled ones are not charted, as in the design).
  const chipsFor = (date) => [
    ...(HISTORY[date] ?? []),
    ...sessionsOn(sessions, date).filter((s) => s.status !== 'cancelled').map((s) => s.status),
  ]

  const select = (date) => {
    if (date === TODAY) {
      goTo('/day')
      return
    }
    setSelected(date)
    if (sessionsOn(sessions, date).length) openDay(date)
  }

  return (
    <div className="atlas-app atlas-month-view">
      <Sidebar variant="month" />

      <main data-view-content className="atlas-month-main atlas-page-enter">
        <header className="atlas-month-header atlas-raised">
          <div>
            <div className="atlas-month-title-row">
              <h1 key={`${ym.y}-${ym.m}`} className={`atlas-month-title${slide.dir ? ' atlas-rise' : ''}`}>{monthTitle(ym.y, ym.m)}</h1>
              <div className="atlas-month-nav">
                <button className="atlas-month-nav-btn atlas-icon-btn atlas-raised-sm" aria-label="Previous month" onClick={() => shift(-1)}>&lt;</button>
                <button className="atlas-month-nav-btn atlas-icon-btn atlas-raised-sm" aria-label="Next month" onClick={() => shift(1)}>&gt;</button>
              </div>
            </div>
            <StatusLegend statuses={['insession', 'booked', 'completed']} />
          </div>
          <ViewToggle tone="recessed" wideLabels={false} />
        </header>

        <TodaySummary date={TODAY} sessions={sessionsOn(sessions, TODAY)} />
        <MonthGrid
          cells={monthGrid(ym.y, ym.m)}
          chipsFor={chipsFor}
          selected={selected}
          onSelect={select}
          slide={slide}
          firstRender={slide.key === 0}
        />
      </main>
    </div>
  )
}
