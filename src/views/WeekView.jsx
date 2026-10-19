import Sidebar from '../components/Sidebar.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import StatusLegend from '../components/StatusLegend.jsx'
import WeekGrid from '../components/week/WeekGrid.jsx'
import { TODAY } from '../data/schedule.js'
import { weekOf, weekRangeLabel } from '../lib/dates.js'
import { useSchedule } from '../state/ScheduleContext.jsx'

export default function WeekView() {
  const { sessions } = useSchedule()
  return (
    <div className="atlas-app atlas-week-view">
      <Sidebar />

      <main data-view-content className="atlas-week-main atlas-page-enter">
        <div className="atlas-schedule-panel">
          <header className="atlas-timeline-header">
            <div>
              <div className="atlas-timeline-title-row">
                <h1 className="atlas-timeline-title">Atlas Timeline</h1>
                <span className="atlas-week-range atlas-well-sm">{weekRangeLabel(weekOf(TODAY)).toUpperCase()}</span>
              </div>
              <StatusLegend wide />
            </div>
            <ViewToggle />
          </header>

          <div className="atlas-week-scroll atlas-no-scrollbar">
            <WeekGrid sessions={sessions} />
          </div>
        </div>
      </main>
    </div>
  )
}
