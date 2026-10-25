// OneForma (OF) participant feed. Until the REST API is wired up this serves the
// mock in src/data/oneFormaMock.js. To switch to the real API, set
// VITE_OF_API_URL (and VITE_OF_API_KEY if it needs one) in a .env file; the
// response is expected to be a list of participants shaped like the mock rows.

import { MOCK_OF_PARTICIPANTS } from '../data/oneFormaMock.js'
import { milesFromHq } from './geo.js'

export const OF_ENDORSED = 'Endorsed'
const API_URL = import.meta.env.VITE_OF_API_URL
const API_KEY = import.meta.env.VITE_OF_API_KEY
const MOCK_DELAY_MS = 650

export const usingMock = !API_URL

const wait = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms)
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')) })
})

async function readRows(signal) {
  if (!API_URL) {
    await wait(MOCK_DELAY_MS, signal)
    return MOCK_OF_PARTICIPANTS
  }
  const res = await fetch(`${API_URL.replace(/\/$/, '')}/participants?status=${OF_ENDORSED}`, {
    signal,
    headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
  })
  if (!res.ok) throw new Error(`OneForma answered ${res.status}`)
  const body = await res.json()
  return Array.isArray(body) ? body : body.participants ?? []
}

// Only Endorsed participants are bookable; each gets its distance from HQ.
export async function fetchEndorsed(signal) {
  const rows = await readRows(signal)
  const participants = rows
    .filter((r) => r.status === OF_ENDORSED && Number.isFinite(r.lat) && Number.isFinite(r.lng))
    .map((r) => ({ ...r, id: r.ofId, distMi: milesFromHq(r) }))
    .sort((a, b) => a.distMi - b.distMi)
  return { participants, total: rows.length, fetchedAt: new Date().toISOString() }
}

// Cache, then refresh (spec section 7): the last copy shows at once.
const CACHE_KEY = 'atlas_of_cache_v1'

export function readCache() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CACHE_KEY))
    return saved?.participants ? saved : null
  } catch {
    return null
  }
}

export function writeCache(data) {
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* storage off: no cache */ }
}
