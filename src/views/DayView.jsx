import Sidebar from '../components/Sidebar.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import StatusLegend from '../components/StatusLegend.jsx'
import ActiveSessionCard from '../components/day/ActiveSessionCard.jsx'
import BookingPanel from '../components/day/BookingPanel.jsx'
import SessionCard from '../components/day/SessionCard.jsx'
import { TODAY } from '../data/schedule.js'
import { longDayLabel } from '../lib/dates.js'
import { useStagger } from '../motion/motion.js'
import { sessionsOn, useSchedule } from '../state/ScheduleContext.jsx'

export default function DayView() {
  const { sessions: all } = useSchedule()
  const sessions = sessionsOn(all, TODAY)
  const live = sessions.find((s) => s.status === 'insession')
  const delay = useStagger(sessions.map((s) => s.id), 80)

  return (
    <div className="atlas-app atlas-day-view">
      <Sidebar />

      <main data-view-content className="atlas-day-main atlas-page-enter">
        <div className="atlas-day-side">
          <ActiveSessionCard session={live} />
          <BookingPanel />
        </div>

        <div className="atlas-schedule-panel">
          <header className="atlas-schedule-header">
            <div>
              <h1 className="atlas-schedule-title">Schedule Overview</h1>
              <StatusLegend />
            </div>
            <ViewToggle />
          </header>

          <div className="atlas-session-list">
            <div className="atlas-eyebrow atlas-session-list-date">{longDayLabel(TODAY).toUpperCase()}</div>
            {sessions.map((s) => <SessionCard key={s.id} session={s} style={delay(s.id)} />)}
          </div>
        </div>
      </main>
    </div>
  )
}
