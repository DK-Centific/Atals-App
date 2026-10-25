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
// Every booking points at its OneForma participant (participantId = OF id), whose
// address and map position come from the OF feed.
export const SESSIONS = [
  {
    id: 's6', date: '2024-10-24', start: '08:00', end: '08:45', status: 'completed', team: 'gamma',
    name: 'Priya Nair', short: 'P. Nair', summary: 'Priya Nair', location: '1488 151st Ave NE',
    participantId: 'OF-10265',
  },
  {
    id: 's1', date: '2024-10-24', start: '09:00', end: '10:30', status: 'completed', team: 'alpha',
    name: 'Sarah Jenkins', short: 'S. Jenkins', summary: 'Sarah Jenkins', location: '3024 145th Ave NE',
    participantId: 'OF-10230',
  },
  {
    id: 's2', date: '2024-10-24', start: '11:00', end: '12:00', status: 'cancelled', team: 'beta',
    name: 'Robert Chen', short: 'R. Chen', summary: 'Robert Chen', location: '3412 161st Ave NE',
    participantId: 'OF-10237',
  },
  {
    id: 's7', date: '2024-10-24', start: '12:15', end: '13:30', status: 'completed', team: 'gamma',
    name: 'Omar Haddad', short: 'O. Haddad', summary: 'Omar Haddad', location: '17440 NE 42nd St',
    participantId: 'OF-10272',
  },
  {
    id: 's3', date: '2024-10-24', start: '14:30', end: '16:00', status: 'insession', team: 'alpha',
    name: 'Evelyn Vance', short: 'E. Vance', summary: 'Evelyn Vance', location: '13802 NE 34th St',
    participantId: 'OF-10244',
    protocol: 'Assessment', eta: '14:25', timezone: 'PT',
  },
  {
    id: 's4', date: '2024-10-24', start: '16:30', end: '17:45', status: 'booked', team: 'beta',
    name: 'Marcus Thorne', short: 'M. Thorne', summary: 'Marcus Thorne', location: '3915 139th Ave NE',
    participantId: 'OF-10251',
  },
  {
    id: 's8', date: '2024-10-24', start: '17:00', end: '18:00', status: 'booked', team: 'alpha',
    name: 'Ethan Brooks', short: 'E. Brooks', summary: 'Ethan Brooks', location: '3374 143rd Ave NE',
    participantId: 'OF-10370',
  },
  {
    id: 's5', date: '2024-10-24', start: '19:00', end: '20:30', status: 'booked', team: 'gamma',
    name: 'Dr. Alana Rivera', short: 'A. Rivera', summary: 'Dr. Rivera', location: '16257 NE 35th St',
    participantId: 'OF-10258',
  },
  {
    id: 's9', date: '2024-10-25', start: '10:00', end: '11:30', status: 'booked', team: 'beta',
    name: 'Lena Fischer', short: 'L. Fischer', summary: 'Lena Fischer', location: '1605 125th Ave NE',
    participantId: 'OF-10279',
  },
  {
    id: 's10', date: '2024-10-25', start: '14:00', end: '15:00', status: 'booked', team: 'alpha',
    name: 'June Park', short: 'J. Park', summary: 'June Park', location: '1463 114th Ave NE',
    participantId: 'OF-10293',
  },
  {
    id: 's11', date: '2024-10-22', start: '13:00', end: '14:00', status: 'completed', team: 'gamma',
    name: 'Grace Okafor', short: 'G. Okafor', summary: 'Grace Okafor', location: '15319 NE 1st St',
    participantId: 'OF-10307',
  },
  {
    id: 's12', date: '2024-10-23', start: '10:00', end: '11:00', status: 'completed', team: 'beta',
    name: 'Sofia Rossi', short: 'S. Rossi', summary: 'Sofia Rossi', location: '3937 136th Ave NE',
    participantId: 'OF-10377',
  },
  {
    id: 's13', date: '2024-10-26', start: '09:30', end: '11:00', status: 'booked', team: 'gamma',
    name: 'Kwame Mensah', short: 'K. Mensah', summary: 'Kwame Mensah', location: '17509 NE 26th St',
    participantId: 'OF-10384',
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
