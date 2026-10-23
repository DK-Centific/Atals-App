// Seed for the Map view (from the Map View design). Positions are on the
// design's 1440 x 900 map canvas. Points with a `sessionId` take their name,
// time and status from the schedule; the rest are other field sessions nearby.
// `reveal` is the zoom-out level at which a point appears (1 = first step out).

export const MAP_CANVAS = { w: 1440, h: 900 }

// Zoom steps, closest first. Index 2 (scale 1) is where the map opens.
export const MAP_ZOOMS = [1.3, 1.15, 1, 0.85, 0.7, 0.55]
export const MAP_START_ZOOM = 2

export const MAP_ROUTE = {
  from: { x: 1100, y: 800, label: 'TEAM ALPHA · EN ROUTE' },
  to: { x: 720, y: 300 },
  path: 'M1100 800 C 1100 650, 900 650, 850 500 C 800 350, 750 350, 720 300',
  distance: '2.4 mi away',
}

export const MAP_POINTS = [
  { id: 'm1', reveal: 1, x: 300, y: 190, sessionId: 's1' },
  { id: 'm2', reveal: 1, x: 560, y: 420, sessionId: 's4' },
  { id: 'm3', reveal: 1, x: 180, y: 430, sessionId: 's2' },
  { id: 'm4', reveal: 1, x: 920, y: 170, name: 'Priya Nair', time: '17:00', status: 'booked' },
  { id: 'm5', reveal: 2, x: 1230, y: 300, sessionId: 's5' },
  { id: 'm6', reveal: 2, x: 430, y: 720, name: 'Omar Haddad', time: '14:20', status: 'insession' },
  { id: 'm7', reveal: 2, x: 1000, y: 600, name: 'Lena Fischer', time: '15:30', status: 'booked' },
  { id: 'm8', reveal: 3, x: 1300, y: 750, name: 'Tomás Rivera', time: '16:00', status: 'booked' },
  { id: 'm9', reveal: 3, x: 680, y: 140, name: 'June Park', time: '14:50', status: 'insession' },
  { id: 'm10', reveal: 3, x: 780, y: 760, name: 'Elias Wu', time: '17:15', status: 'booked' },
]

// Locations not booked yet, with suggested slots ranked by travel (P0 = shortest).
export const MAP_PENDING = [
  {
    id: 'p1', reveal: 1, x: 610, y: 660, name: 'HAWTHORNE CLINIC',
    slots: [
      { prio: 'P0', when: 'OCT 24 · 13:30', range: 'OCT 24 · 13:30 — 15:00', note: 'w/ Omar Haddad · 0.8 mi between stops' },
      { prio: 'P1', when: 'OCT 24 · 09:00', range: 'OCT 24 · 09:00 — 10:30', note: 'w/ Marcus Thorne · 1.4 mi cluster' },
      { prio: 'P2', when: 'OCT 27 · 14:00', range: 'OCT 27 · 14:00 — 15:30', note: 'w/ Robert Chen · 3.2 mi · next opening' },
    ],
  },
  {
    id: 'p2', reveal: 2, x: 1080, y: 500, name: 'MAPLE WARD',
    slots: [
      { prio: 'P0', when: 'OCT 24 · 15:45', range: 'OCT 24 · 15:45 — 17:00', note: 'w/ Dr. Alana Rivera · 1.1 mi from last stop' },
      { prio: 'P1', when: 'OCT 24 · 11:00', range: 'OCT 24 · 11:00 — 12:30', note: 'w/ Team Alpha · 1.8 mi route pass-by' },
      { prio: 'P2', when: 'OCT 26 · 09:30', range: 'OCT 26 · 09:30 — 11:00', note: 'w/ Lena Fischer · 2.6 mi · next opening' },
    ],
  },
  {
    id: 'p3', reveal: 3, x: 840, y: 370, name: 'BIRCHWOOD HOME',
    slots: [
      { prio: 'P0', when: 'OCT 25 · 13:00', range: 'OCT 25 · 13:00 — 14:30', note: 'w/ Sarah Jenkins · 0.9 mi cluster' },
      { prio: 'P1', when: 'OCT 24 · 16:00', range: 'OCT 24 · 16:00 — 17:00', note: 'w/ June Park · 2.0 mi between stops' },
      { prio: 'P2', when: 'OCT 27 · 10:00', range: 'OCT 27 · 10:00 — 11:30', note: 'w/ Priya Nair · 2.9 mi · next opening' },
    ],
  },
]
