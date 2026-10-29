// Centific HQ: every map view starts here, and distances are measured from it.
// Same point Twilight uses (GEO_HQ_CENTER).
export const HQ = {
  name: 'Centific HQ',
  address: '14980 NE 31st St Ste 100, Redmond, WA 98052',
  lng: -122.137,
  lat: 47.6446,
}

const EARTH_MILES = 3958.8
const rad = (d) => (d * Math.PI) / 180

export function milesBetween(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h))
}

export const milesFromHq = (p) => milesBetween(HQ, p)

// null: the address has no map point yet (the OneForma feed carries no coordinates).
export const formatMiles = (mi) => {
  if (mi == null) return 'no map point'
  return mi < 0.1 ? 'at HQ' : `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`
}

/** A participant's distance from HQ; "about" when it comes from their ZIP code centre. */
export const participantMiles = (p) =>
  `${p?.pointSource === 'zip' && p?.distMi != null ? 'about ' : ''}${formatMiles(p?.distMi)}`

// A box `miles` out from a point on every side, as [[west, south], [east, north]].
export function boxAround(p, miles) {
  const dLat = miles / 69
  const dLng = miles / (69 * Math.cos(rad(p.lat)))
  return [[p.lng - dLng, p.lat - dLat], [p.lng + dLng, p.lat + dLat]]
}

// A gentle arc from a to b (a quadratic curve bowed to one side), as [lng, lat] points.
export function arcBetween(a, b, steps = 64) {
  const mx = (a.lng + b.lng) / 2
  const my = (a.lat + b.lat) / 2
  const dx = b.lng - a.lng
  const dy = b.lat - a.lat
  const cx = mx - dy * 0.25
  const cy = my + dx * 0.25
  const pts = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const u = 1 - t
    pts.push([u * u * a.lng + 2 * u * t * cx + t * t * b.lng, u * u * a.lat + 2 * u * t * cy + t * t * b.lat])
  }
  return pts
}
