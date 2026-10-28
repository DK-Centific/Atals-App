import { useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import StatusLegend from '../components/StatusLegend.jsx'
import TodaySummary from '../components/month/TodaySummary.jsx'
import MonthGrid from '../components/month/MonthGrid.jsx'
import FilterMenu from '../components/filter/FilterMenu.jsx'
import FilterBar from '../components/filter/FilterBar.jsx'
import { HISTORY, TODAY } from '../data/schedule.js'
import { monthGrid, monthTitle, parse } from '../lib/dates.js'
import { hasGroup } from '../lib/filters.js'
import useViewNavigate from '../motion/useViewNavigate.js'
import { useFilteredPicks, useMatches } from '../state/FilterContext.jsx'
import { sessionsOn, useSchedule } from '../state/ScheduleContext.jsx'

export default function MonthView() {
  const { sessions, openDay, triggerRef } = useSchedule()
  const matches = useMatches()
  const picks = useFilteredPicks()
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

  // Cancelled bookings are left off the month (as in the design) unless the
  // status filter asks for them.
  const statusPicked = hasGroup(picks, 'status')
  const charted = (s) => (statusPicked || s.status !== 'cancelled') && matches(s)

  const listed = (date) => sessionsOn(sessions, date).filter(charted)
  // Seeded history has a status but no moderator, so a moderator filter leaves it out.
  const chipsFor = (date) => [
    ...(HISTORY[date] ?? []).filter((status) => matches({ status })),
    ...listed(date).map((s) => s.status),
  ]

  const select = (date, el) => {
    if (date === TODAY) {
      goTo('/day')
      return
    }
    setSelected(date)
    if (listed(date).length) {
      triggerRef.current = el
      openDay(date)
    }
  }

  const monthSessions = sessions.filter((s) => s.date.startsWith(`${ym.y}-${String(ym.m + 1).padStart(2, '0')}`))

  return (
    <div className="atlas-app atlas-month-view">
      <Sidebar variant="month" />

      <main data-view-content className="atlas-month-main atlas-view-enter">
        <header className="atlas-month-header atlas-raised">
          <div>
            <div className="atlas-month-title-row">
              <h1 key={`${ym.y}-${ym.m}`} className={`atlas-month-title${slide.dir ? ' atlas-status-line' : ''}`}>{monthTitle(ym.y, ym.m)}</h1>
              <div className="atlas-month-nav">
                <button type="button" className="atlas-month-nav-btn atlas-icon-btn atlas-raised-sm" aria-label="Previous month" onClick={() => shift(-1)}>&lt;</button>
                <button type="button" className="atlas-month-nav-btn atlas-icon-btn atlas-raised-sm" aria-label="Next month" onClick={() => shift(1)}>&gt;</button>
              </div>
            </div>
            <StatusLegend statuses={['insession', 'booked', 'completed']} sessions={monthSessions} />
          </div>
          <div className="atlas-header-tools">
            <FilterMenu />
            <ViewToggle tone="recessed" wideLabels={false} />
          </div>
        </header>
        <FilterBar shown={monthSessions.filter(matches).length} total={monthSessions.length} />

        <TodaySummary date={TODAY} sessions={sessionsOn(sessions, TODAY).filter(charted)} />
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
