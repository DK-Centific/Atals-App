# Atlas Scheduling

React + Vite + Tailwind build of the Atlas Scheduling designs (Day, Week and Month views).

```bash
npm install
npm run dev      # http://localhost:5173  (redirects to /day)
npm run build
```

## Routes

| Route    | View                                                                 |
|----------|----------------------------------------------------------------------|
| `/day`   | Schedule Overview: live session card, New Booking form, day's sessions |
| `/week`  | Atlas Timeline: hour-by-day grid for Oct 21 - Oct 27                  |
| `/month` | October 2024 grid with today's sessions strip                        |

The DAY / WEEK / MONTH pills switch routes; "VIEW FULL DAY →" on Month opens Day.

## Layout

```
src/
  data/schedule.js          seed sessions, teams, week and month data (one source for all views)
  index.css                 design tokens and component classes from the designs
  components/
    Sidebar.jsx             left rail (Month uses its own variant, as designed)
    ViewToggle.jsx          DAY / WEEK / MONTH pills
    StatusLegend.jsx        status legend + StatusDot
    Icons.jsx
    day/                    ActiveSessionCard, BookingPanel, SessionCard
    week/                   WeekGrid, CalendarEvent
    month/                  TodaySummary, MonthGrid
  views/                    DayView, WeekView, MonthView
```

## Motion and interaction

Motion follows Project Twilight (Helios booking and its page transitions); the tokens and rules are in the
"Motion" section at the end of `src/index.css`:

- **Page change**: the current view fades down and out (0.22s), the next rises 18px into place (0.68s, `--ease-out`).
- **Lists and grids**: one-shot staggered rise when a view opens (session cards, week events, month cells, today strip).
- **Raised controls**: hover deepens the shadow, press sinks into an inset well and scales to 97%, selection settles over 0.5s (`--ease-ui`).
- **Feedback**: Twilight-style toast after booking; the time fields shake if the end time is before the start time.
- Keyboard: every control is focusable and works with Enter/Space; `prefers-reduced-motion` turns motion off.

## What works

- Book Session adds the session to all three views (in memory until reload) and confirms with a toast.
- The booking panel's week arrows, the Month arrows, map zoom, and the "+" (reset the form) work.
- Clicking today's sessions (Week events, Month strip, today's Month cell) opens the Day view.
- Not built yet: saving bookings, "CREATE NEW" team, client name/location on a booking, and the Teams/Participants/Settings pages.
