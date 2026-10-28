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
- **Edit**, **Reschedule** (keeps a "rescheduled from" record and a reason) and **Cancel** (reason; the booking
  stays on the calendar as Cancelled) all happen in that sheet. The reason is required when the booking is linked to a OneForma participant. **Start session** and **Mark completed** move a booking through
  its statuses; only one session can be live at a time.
- **Right-click** a session (or Shift+F10 on it) for View / Edit / Reschedule / Cancel. Escape closes the sheet or menu.
- Completed and cancelled bookings are read-only, as in Twilight.
- Bookings load from SharePoint (`Atlas_Bookings`) through the Power Automate read flow and every change saves back through
  the "Atlas action" flow (see below). This browser keeps a copy (`atlas_schedule_v3`) that shows at once and is replaced
  when SharePoint answers. Without the flow addresses the app runs on seed data in dry run.
- Map zoom, the booking panel's week arrows, the Month arrows and the "+" (reset the form) work.
- Not built yet: "CREATE NEW" team, and the Teams/Participants/Settings pages.

## OneForma link

Built on OneForma's integration guide v1 (2026-10-27). Code: `src/lib/oneforma/` (typed: `npm run typecheck`).

- **Participants in** (`participants.ts`, `feed.ts`): OneForma's shared Event Hub sends `projectUserRelation` messages. Every
  payload item is checked for the Atlas projectId, messageIds are de-duplicated, rows are upserted by projectId + userId + requestId,
  an older message never overwrites a newer one, and `remove` keeps the person (and their history) but makes them unbookable.
  The feed has no map coordinates; sample people get theirs from `SAMPLE_COORDS` until geocoding is decided.
- **Changes out** (`actions.ts`, `events.ts`, `transport.ts`, `SyncContext.tsx`): every change to a booking (book, edit,
  reschedule, cancel, start, interrupt, complete, recording, QA) becomes one action for the Power Automate "Atlas action" flow:
  `{ schemaVersion, actionId, action, environment, occurredAt, booking, notify, oneforma }`. The flow upserts the
  `Atlas_Bookings` row (`booking`), emails the participant and the team's moderators when `notify` is set (book, reschedule,
  cancel; the "Email the participant and moderators" box, on by default), and forwards `oneforma`, a section-5 callback event,
  when the booking is linked to a OneForma participant. Events are checked against the guide before they are queued and their
  revisions go up per entity. Interruptions and detail edits are saved but have no OneForma event.
- **Checklist link**: each booking links to the checklist app at `VITE_CHECKLIST_URL?booking=atlas-bk-<id>`; the checklist
  finds the session in `Atlas_Bookings` by BookingId. The moderators' email carries the same link.
- **Sync sheet** (the ⇄ button on the rail): the feed summary and every change with its status, emails and JSON.

Configuration lives in `.env.local` (never committed; no credentials ever go in the browser):

```
VITE_OF_ENV=uat                 # or prod
VITE_ATLAS_ACTION_URL=          # "Atlas action" flow (POST). Unset = dry run: actions are built and checked, not sent.
VITE_ATLAS_READ_URL=            # Read flow (GET) returning { syncedAt, participants, bookings }. Unset = sample data.
VITE_CHECKLIST_URL=             # Checklist app address.
```

Live, each action waits 10 seconds (so Undo can still withdraw it), then goes to the flow one at a time, never overtaking an
earlier action for the same booking. Network errors and 5xx retry with the same actionId (4 tries); the flow skips an actionId
it has already done, so a retry never saves or emails twice. The flow adds the callback token and the
`Atlas-OneForma-Integration/1.0` User-Agent and answers `{ actionId, saved, emailed, oneforma, duplicate, message }`.
Contract: `/mnt/project-files/oneforma/pa-bot-instructions-v2.md` in the project files.