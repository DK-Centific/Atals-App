import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import DayView from './views/DayView.jsx'
import WeekView from './views/WeekView.jsx'
import MonthView from './views/MonthView.jsx'
import ChecklistView from './views/ChecklistView.jsx'
import UsersView from './views/UsersView.jsx'
import TrackerView from './views/TrackerView.jsx'
import TemplatesView from './views/TemplatesView.jsx'
import BookingDrawer from './components/booking/BookingDrawer.jsx'
import BookingMenu from './components/booking/BookingMenu.jsx'
import AppMenu, { useAppMenuTrigger } from './components/AppMenu.jsx'
import SyncSheet from './components/sync/SyncSheet.jsx'
import { useRole } from './state/RoleContext.jsx'

const TITLES = {
  '/day': 'Atlas Scheduling | Desktop',
  '/day/map': 'Atlas Scheduling | Map View',
  '/week': 'Atlas Scheduling | Week View',
  '/month': 'Atlas Scheduling | Month View',
  '/templates': 'Atlas Scheduling | Email templates',
}

// One URL for every role; the role picks the landing screen and what else is
// reachable. Moderator: Checklist. Scheduler: Booking and Email templates.
// Admin: Booking, Email templates, Users, Tracker, Checklist.
export default function App() {
  const { pathname } = useLocation()
  const { canBook, isAdmin, landing } = useRole()
  useAppMenuTrigger(canBook)

  useEffect(() => {
    if (TITLES[pathname]) document.title = TITLES[pathname]
  }, [pathname])

  const home = <Navigate to={landing} replace />

  return (
    <>
      <Routes>
        <Route path="/" element={home} />
        <Route path="/checklist" element={canBook && !isAdmin ? home : <ChecklistView />} />
        <Route path="/day/*" element={canBook ? <DayView /> : home} />
        <Route path="/week" element={canBook ? <WeekView /> : home} />
        <Route path="/month" element={canBook ? <MonthView /> : home} />
        <Route path="/templates" element={canBook ? <TemplatesView /> : home} />
        <Route path="/admin/users" element={isAdmin ? <UsersView /> : home} />
        <Route path="/admin/tracker" element={isAdmin ? <TrackerView /> : home} />
        <Route path="*" element={home} />
      </Routes>
      {canBook && (
        <>
          <BookingDrawer />
          <BookingMenu />
          <AppMenu />
        </>
      )}
      <SyncSheet />
    </>
  )
}
