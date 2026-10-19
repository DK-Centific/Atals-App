import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import DayView from './views/DayView.jsx'
import WeekView from './views/WeekView.jsx'
import MonthView from './views/MonthView.jsx'
import BookingDrawer from './components/booking/BookingDrawer.jsx'
import BookingMenu from './components/booking/BookingMenu.jsx'

const TITLES = {
  '/day': 'Atlas Scheduling | Desktop',
  '/week': 'Atlas Scheduling | Week View',
  '/month': 'Atlas Scheduling | Month View',
}

export default function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (TITLES[pathname]) document.title = TITLES[pathname]
  }, [pathname])

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/day" replace />} />
        <Route path="/day" element={<DayView />} />
        <Route path="/week" element={<WeekView />} />
        <Route path="/month" element={<MonthView />} />
        <Route path="*" element={<Navigate to="/day" replace />} />
      </Routes>
      <BookingDrawer />
      <BookingMenu />
    </>
  )
}
