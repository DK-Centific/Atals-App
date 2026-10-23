import { useCallback } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import StatusLegend from '../components/StatusLegend.jsx'
import ActiveSessionCard from '../components/day/ActiveSessionCard.jsx'
import BookingPanel from '../components/day/BookingPanel.jsx'
import SessionCard from '../components/day/SessionCard.jsx'
import FilterMenu from '../components/filter/FilterMenu.jsx'
import FilterBar from '../components/filter/FilterBar.jsx'
import MapView from '../components/map/MapView.jsx'
import { TODAY } from '../data/schedule.js'
import { longDayLabel } from '../lib/dates.js'
import { useStagger } from '../motion/motion.js'
import { useMatches } from '../state/FilterContext.jsx'
import { sessionsOn, useSchedule } from '../state/ScheduleContext.jsx'

export default function DayView() {
  const { sessions: all } = useSchedule()
  const matches = useMatches()
  const day = sessionsOn(all, TODAY)
  const sessions = day.filter(matches)
  const live = day.find((s) => s.status === 'insession')
  const delay = useStagger(day.map((s) => s.id))
  // /day/map opens the live map over this view; closing it returns to /day.
  const mapOpen = Boolean(useMatch('/day/map'))
  const navigate = useNavigate()
  const closeMap = useCallback(() => navigate('/day'), [navigate])

  return (
    <div className="atlas-app atlas-day-view">
      <Sidebar />

      <main data-view-content className="atlas-day-main atlas-view-enter" inert={mapOpen ? '' : undefined}>
        <div className="atlas-day-side">
          <ActiveSessionCard session={live} onOpenMap={() => navigate('/day/map')} />
          <BookingPanel />
        </div>

        <div className="atlas-schedule-panel">
          <header className="atlas-schedule-header">
            <div>
              <h1 className="atlas-schedule-title">Schedule Overview</h1>
              <StatusLegend />
            </div>
            <div className="atlas-header-tools">
              <FilterMenu />
            </div>
          </header>
          <FilterBar shown={sessions.length} total={day.length} />

          <div className="atlas-session-list">
            <div className="atlas-eyebrow atlas-session-list-date">{longDayLabel(TODAY).toUpperCase()}</div>
            {sessions.map((s) => <SessionCard key={s.id} session={s} style={delay(s.id)} />)}
            {sessions.length === 0 && (
              <div className="atlas-empty atlas-row-in">No sessions today match these filters.</div>
            )}
          </div>

          {/* Day / Week / Month float in a dock over the bottom of the schedule. */}
          <div className="atlas-view-dock">
            <ViewToggle tone="dock" />
          </div>
        </div>
      </main>

      <MapView open={mapOpen} onClose={closeMap} />
    </div>
  )
}
