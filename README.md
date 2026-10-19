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
  lib/bookings.js           booking rules: validation, team double-booking, read-only statuses, display names
  index.css                 design tokens and component classes from the designs
  components/
    Sidebar.jsx             left rail (Month uses its own variant, as designed)
    ViewToggle.jsx          DAY / WEEK / MONTH pills
    StatusLegend.jsx        status legend + StatusDot
    Icons.jsx
    booking/                BookingDrawer (details, edit, reschedule, cancel), BookingMenu (right-click), Fields
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

- **New Booking** (Day view): pick a day, times, participant, location and team; contact and notes are optional. Booking checks
  that the end is after the start, the slot is today or later and between 08:00 and 22:00, and that the team isn't already booked then.
- **Booking details**: click any session (Day card, Week event, Month "today" strip, or a Month day with bookings) to open the
  side sheet with participant, contact, team, location, protocol, notes and an activity history.
- **Edit**, **Reschedule** (keeps a "rescheduled from" record and an optional reason) and **Cancel** (optional reason; the booking
  stays on the calendar as Cancelled) all happen in that sheet. **Start session** and **Mark completed** move a booking through
  its statuses; only one session can be live at a time.
- **Right-click** a session (or Shift+F10 on it) for View / Edit / Reschedule / Cancel. Escape closes the sheet or menu.
- Completed and cancelled bookings are read-only, as in Twilight.
- Bookings are saved in this browser's localStorage (`atlas_schedule_v1`), so changes survive a refresh. Clear site data to go
  back to the seed schedule. There is no backend.
- Map zoom, the booking panel's week arrows, the Month arrows and the "+" (reset the form) work.
- Not built yet: confirmation emails, "CREATE NEW" team, and the Teams/Participants/Settings pages.
