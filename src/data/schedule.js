// Seed data for the prototype. Everything here mirrors the Day, Week and Month
// designs: one booked week (Oct 21 - Oct 27, 2024) with Thursday Oct 24 as "today".

export const STATUS = {
  insession: { label: 'In Session', dayLabel: 'IN SESSION', weekLabel: 'ACTIVE' },
  booked: { label: 'Booked', dayLabel: 'BOOKED', weekLabel: 'BOOKED' },
  completed: { label: 'Completed', dayLabel: 'COMPLETED', weekLabel: 'DONE' },
  cancelled: { label: 'Cancelled', dayLabel: 'CANCELLED', weekLabel: 'CANCEL' },
}

export const TEAMS = [
  { id: 'alpha', code: 'T1', name: 'Team 1 (Alpha)', short: 'Alpha' },
  { id: 'beta', code: 'T2', name: 'Team 2 (Beta)', short: 'Beta' },
  { id: 'gamma', code: 'T3', name: 'Team 3 (Gamma)', short: 'Gamma' },
]

export const teamShort = (id) => TEAMS.find((t) => t.id === id)?.short ?? id

export const TODAY = '2024-10-24'


// name: full name (Day view), short: Week view abbreviation, summary: Month summary bar.
export const SESSIONS = [
  {
    id: 's1', date: '2024-10-24', start: '09:00', end: '10:30', status: 'completed', team: 'alpha',
    name: 'Sarah Jenkins', short: 'S. Jenkins', summary: 'Sarah Jenkins', location: 'Remote Link',
  },
  {
    id: 's2', date: '2024-10-24', start: '11:00', end: '12:00', status: 'cancelled', team: 'beta',
    name: 'Robert Chen', short: 'R. Chen', summary: 'Robert Chen', location: '451 Appian Way',
  },
  {
    id: 's3', date: '2024-10-24', start: '14:30', end: '16:00', status: 'insession', team: 'alpha',
    name: 'Evelyn Vance', short: 'E. Vance', summary: 'Evelyn Vance', location: '742 Evergreen Terr.',
    protocol: 'Assessment', eta: '14:25', timezone: 'GMT',
  },
  {
    id: 's4', date: '2024-10-24', start: '16:30', end: '17:45', status: 'booked', team: 'beta',
    name: 'Marcus Thorne', short: 'M. Thorne', summary: 'Marcus Thorne', location: '1200 Pacific Coast Hwy',
  },
  {
    id: 's5', date: '2024-10-24', start: '19:00', end: '20:30', status: 'booked', team: 'gamma',
    name: 'Dr. Alana Rivera', short: 'A. Rivera', summary: 'Dr. Rivera', location: '88 Constellation Blvd',
  },
]

// Earlier October sessions shown as status chips in the Month view
// (date -> statuses). The Oct 21 - Oct 27 week is driven by SESSIONS below.
export const HISTORY = {
  '2024-10-01': ['completed'],
  '2024-10-02': ['completed', 'cancelled'],
  '2024-10-03': ['completed'],
  '2024-10-05': ['booked'],
  '2024-10-07': ['completed'],
  '2024-10-08': ['completed', 'completed'],
  '2024-10-09': ['completed'],
  '2024-10-11': ['completed'],
  '2024-10-12': ['booked'],
  '2024-10-14': ['completed'],
  '2024-10-16': ['completed', 'completed'],
  '2024-10-17': ['completed'],
  '2024-10-18': ['completed'],
  '2024-10-20': ['booked'],
  '2024-10-21': ['completed'],
  '2024-10-22': ['completed', 'completed'],
  '2024-10-23': ['completed'],
  '2024-10-25': ['booked'],
  '2024-10-27': ['booked'],
  '2024-10-29': ['booked'],
  '2024-10-30': ['booked'],
}

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
