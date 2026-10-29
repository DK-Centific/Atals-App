// Mileage per session: the round trip HQ -> participant -> HQ. Best source first:
//   road      the road route, as the map draws it (needs the participant's map point)
//   location  straight line from HQ to their map point, x 1.35 for roads
//   zip       straight line from HQ to their ZIP code's centre (bundled table), x 1.35
//   admin     a correction an Admin typed on the booking
// Addresses never leave the browser: ZIP centres come from a table shipped with the
// app, and only map points (never ZIP centres or addresses) go to the router.

import { useEffect, useMemo, useState } from 'react'
import { zipOf, zipPoint } from './zipPoints.js'
import { HQ, milesBetween } from './geo.js'
import { cachedTrip, routeBetween } from './routing.js'

const DETOUR = 1.35 // same guess routing.js uses for its estimate
const AT_ONCE = 4 // road lookups in flight at a time

export const MILES_SOURCE = {
  road: 'Road route from HQ',
  location: 'Estimate: straight line to the participant’s map point × 1.35',
  zip: 'Estimate: straight line to the ZIP code’s centre × 1.35',
  admin: 'Set by admin',
}
/** Estimates get an "approx." mark; a road route or an admin's number doesn't. */
export const isApprox = (source) => source !== 'road' && source !== 'admin'

// Only a participant's own map point counts as located: a ZIP centre placed for
// the map is an estimate and never goes to the router.
const located = (p) => p && p.lat != null && p.lng != null && p.pointSource !== 'zip'

export { zipOf }

/** One-way estimate without any network call, or null. */
function estimate(p) {
  if (located(p)) return { miles: milesBetween(HQ, p) * DETOUR, source: 'location' }
  const c = zipPoint(p)
  if (c) return { miles: milesBetween(HQ, c) * DETOUR, source: 'zip' }
  return null
}

/** { [participantId]: { miles (one way), source } } for the participants given. */
export function useOneWayMiles(participants) {
  const points = useMemo(() => participants.filter(located), [participants])
  const key = points.map((p) => p.id).sort().join(',')
  const [road, setRoad] = useState({})

  useEffect(() => {
    const ctrl = new AbortController()
    const queue = points.filter((p) => !road[p.id])
    let next = 0
    const work = async () => {
      while (next < queue.length && !ctrl.signal.aborted) {
        const p = queue[next++]
        try {
          const trip = await routeBetween(HQ, p, ctrl.signal)
          if (!ctrl.signal.aborted && !trip.estimated) setRoad((r) => ({ ...r, [p.id]: { miles: trip.miles, source: 'road' } }))
        } catch { /* aborted */ }
      }
    }
    for (let i = 0; i < AT_ONCE; i += 1) work()
    return () => ctrl.abort()
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => {
    const out = {}
    for (const p of participants) {
      const leg = road[p.id] ?? estimate(p)
      if (leg) out[p.id] = leg
    }
    return out
  }, [participants, road])
}

/**
 * Round-trip miles for a session: the routeMiles saved with the booking when it
 * has one, else worked out here (so bookings saved without it still count);
 * null when there is nothing to go on.
 */
export function roundTrip(oneWay, session) {
  if (typeof session.routeMiles === 'number') {
    const source = session.routeMilesSource ?? 'road'
    return { miles: session.routeMiles, source, approx: isApprox(source) }
  }
  const leg = oneWay[session.participantId]
  return leg ? { miles: leg.miles * 2, source: leg.source, approx: isApprox(leg.source) } : null
}

/** { routeMiles, routeMilesSource } to save with a new booking, or null. */
export function bookingRouteMiles(participant) {
  if (!participant) return null
  const road = located(participant) ? cachedTrip(HQ, participant) : null
  const leg = road && !road.estimated ? { miles: road.miles, source: 'road' } : estimate(participant)
  return leg ? { routeMiles: Math.round(leg.miles * 2 * 100) / 100, routeMilesSource: leg.source } : null
}

/** How a set of trips was measured, e.g. "Includes estimates …: 2 from ZIP centre. 1 set by admin", or null. */
export function estimateNote(trips) {
  const counts = { location: 0, zip: 0, admin: 0 }
  for (const t of trips) if (t && counts[t.source] !== undefined) counts[t.source] += 1
  const parts = [counts.zip && `${counts.zip} from ZIP centre`, counts.location && `${counts.location} from map point`].filter(Boolean)
  return [
    parts.length && `Includes estimates (straight line × 1.35): ${parts.join(', ')}`,
    counts.admin && `${counts.admin} set by admin`,
  ].filter(Boolean).join('. ') || null
}

export const formatMi = (mi) => `${mi < 100 ? mi.toFixed(1) : Math.round(mi).toLocaleString('en-US')} mi`
