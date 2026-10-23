import Sidebar from '../components/Sidebar.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import StatusLegend from '../components/StatusLegend.jsx'
import WeekGrid from '../components/week/WeekGrid.jsx'
import FilterMenu from '../components/filter/FilterMenu.jsx'
import FilterBar from '../components/filter/FilterBar.jsx'
import { TODAY } from '../data/schedule.js'
import { weekOf, weekRangeLabel } from '../lib/dates.js'
import { useMatches } from '../state/FilterContext.jsx'
import { useSchedule } from '../state/ScheduleContext.jsx'

export default function WeekView() {
  const { sessions } = useSchedule()
  const matches = useMatches()
  const week = weekOf(TODAY)
  const inWeek = sessions.filter((s) => s.date >= week[0].date && s.date <= week[6].date)
  const shown = inWeek.filter(matches)

  return (
    <div className="atlas-app atlas-week-view">
      <Sidebar />

      <main data-view-content className="atlas-week-main atlas-view-enter">
        <div className="atlas-schedule-panel">
          <header className="atlas-timeline-header">
            <div>
              <div className="atlas-timeline-title-row">
                <h1 className="atlas-timeline-title">Atlas Timeline</h1>
                <span className="atlas-week-range atlas-well-sm">{weekRangeLabel(week).toUpperCase()}</span>
              </div>
              <StatusLegend wide />
            </div>
            <div className="atlas-header-tools">
              <FilterMenu />
              <ViewToggle />
            </div>
          </header>
          <FilterBar shown={shown.length} total={inWeek.length} />

          <div className="atlas-week-scroll atlas-no-scrollbar">
            <WeekGrid sessions={shown} />
          </div>
        </div>
      </main>
    </div>
  )
}
