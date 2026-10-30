import { useCallback, useEffect, useRef, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import StatusLegend from '../components/StatusLegend.jsx'
import ActiveSessionCard from '../components/day/ActiveSessionCard.jsx'
import BookingPanel from '../components/day/BookingPanel.jsx'
import MapTile from '../components/day/MapTile.jsx'
import SessionCard from '../components/day/SessionCard.jsx'
import FilterMenu from '../components/filter/FilterMenu.jsx'
import FilterBar from '../components/filter/FilterBar.jsx'
import MapView from '../components/map/MapView.jsx'
import PtClock from '../components/PtClock.jsx'
import TourButton from '../tour/TourButton.jsx'
import { TODAY } from '../data/schedule.js'
import { fullDayLabel } from '../lib/dates.js'
import { useStagger } from '../motion/motion.js'
import { useMatches } from '../state/FilterContext.jsx'
import { useRole } from '../state/RoleContext.jsx'
import { sessionsOn, useSchedule } from '../state/ScheduleContext.jsx'

export default function DayView() {
  const { sessions: all } = useSchedule()
  const matches = useMatches()
  const day = sessionsOn(all, TODAY)
  const sessions = day.filter(matches)
  // The live-session card is for Admins (Schedulers only book) and stays hidden until
  // an in-session card in the list is clicked. It goes away again on a second click,
  // its ×, Esc, or once that session is no longer in session today.
  const { role } = useRole()
  const [liveId, setLiveId] = useState(null)
  const live = role !== 'scheduler' ? day.find((s) => s.id === liveId && s.status === 'insession') ?? null : null
  const lastLive = useRef(null)
  if (live) lastLive.current = live
  useEffect(() => { if (liveId && !live) setLiveId(null) }, [liveId, live])
  const firstLiveId = role !== 'scheduler' ? day.find((s) => s.status === 'insession')?.id : undefined
  const toggleLive = useCallback((id) => setLiveId((cur) => (cur === id ? null : id)), [])
  // Hiding from the card itself sends focus back to its session in the list.
  const hideLive = useCallback(() => {
    document.querySelector(`.atlas-session-list [data-booking-id="${liveId}"]`)?.focus()
    setLiveId(null)
  }, [liveId])
  useEffect(() => {
    if (!live) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[role="dialog"]')) return
      hideLive()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [live, hideLive])
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
          <MapTile onOpen={() => navigate('/day/map')} />
          {role !== 'scheduler' && (
            <div className={`atlas-collapse atlas-live-collapse${live ? ' is-open' : ''}`} inert={live ? undefined : ''}>
              <div className="atlas-collapse-inner">
                <div>{lastLive.current && <ActiveSessionCard session={live ?? lastLive.current} onClose={hideLive} />}</div>
              </div>
            </div>
          )}
          <BookingPanel />
        </div>

        <div className="atlas-schedule-panel">
          <header className="atlas-schedule-header">
            <div>
              <h1 className="atlas-schedule-title" data-tour="day-title">Today <span className="atlas-title-date">{fullDayLabel(TODAY)}</span></h1>
              <StatusLegend sessions={day} />
            </div>
            <div className="atlas-header-tools">
              <PtClock />
              <TourButton />
              <FilterMenu />
            </div>
          </header>
          <FilterBar shown={sessions.length} total={day.length} />

          <div className="atlas-session-list">
            {sessions.map((s, i) => (
              <SessionCard
                key={s.id}
                tour={i === 0 ? 'session-card' : s.id === firstLiveId ? 'session-live' : undefined}
                session={s}
                style={delay(s.id)}
                selected={s.id === live?.id}
                onShowLive={role !== 'scheduler' && s.status === 'insession' ? toggleLive : undefined}
              />
            ))}
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
