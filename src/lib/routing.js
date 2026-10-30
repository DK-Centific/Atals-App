// Road routes from HQ for the map's "Route from HQ", from an OSRM server
// (driving profile). VITE_ROUTING_URL points at our own server (see
// osrm/README.md) once there is one. Until then the public OSRM server is used
// for real data too (DswK approved 2026-10-30, pending InfoSec): only the two
// map points are sent, never names or IDs.
// If routing can't be reached, it falls back to a straight-line estimate and says so.

import { arcBetween, milesBetween } from './geo.js'

const PUBLIC_OSRM = 'https://router.project-osrm.org'
const BASE = (import.meta.env.VITE_ROUTING_URL || PUBLIC_OSRM).replace(/\/$/, '')
const TIMEOUT_MS = 6000
const METERS_PER_MILE = 1609.344
// Fallback guesses: roads run ~1.35x the straight line, ~24 mph average around Redmond.
const DETOUR = 1.35
const AVG_MPH = 24

const cache = new Map()
const keyOf = (a, b) => `${a.lng.toFixed(5)},${a.lat.toFixed(5)};${b.lng.toFixed(5)},${b.lat.toFixed(5)}`

/** A straight-line guess at the drive (no routing call): { coords, miles, minutes }. */
export function estimate(from, to) {
  const miles = milesBetween(from, to) * DETOUR
  return { coords: arcBetween(from, to), miles, minutes: Math.max(2, Math.round((miles / AVG_MPH) * 60)), estimated: true }
}

// Resolves to { coords: [[lng, lat]...], miles, minutes, estimated }. Never rejects
// except when aborted.
export async function routeBetween(from, to, signal) {
  if (!BASE) return { ...estimate(from, to), reason: 'No routing server configured (VITE_ROUTING_URL)' }
  const key = keyOf(from, to)
  if (cache.has(key)) return cache.get(key)
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS)
  const onAbort = () => timeout.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const url = `${BASE}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&alternatives=false&steps=false`
    const res = await fetch(url, { signal: timeout.signal })
    if (!res.ok) throw new Error(`Routing answered ${res.status}`)
    const body = await res.json()
    const best = body.routes?.[0]
    if (body.code !== 'Ok' || !best?.geometry?.coordinates?.length) throw new Error(body.message || 'No road route found')
    const trip = {
      coords: best.geometry.coordinates,
      miles: best.distance / METERS_PER_MILE,
      minutes: Math.max(1, Math.round(best.duration / 60)),
      estimated: false,
    }
    cache.set(key, trip)
    return trip
  } catch (err) {
    if (signal?.aborted) throw err
    return { ...estimate(from, to), reason: err.name === 'AbortError' ? 'Routing timed out' : err.message }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/** A road route already fetched for this pair, or null. */
export const cachedTrip = (from, to) => cache.get(keyOf(from, to)) ?? null

export const etaFrom = (minutes, start = new Date()) =>
  new Date(start.getTime() + minutes * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export const formatDrive = (minutes) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`)
