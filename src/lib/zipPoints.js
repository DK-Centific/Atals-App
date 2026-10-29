// ZIP code centres for participants who have an address but no map point. The
// table ships with the app (US Census ZCTA centres, scripts/zip-centroids.mjs) and
// loads on its own after the page, so addresses never leave the browser and the
// first paint doesn't wait for it.

let table = {}
let loading = null

/** Loads the ZIP table once; resolves true when it holds any ZIPs. */
export function loadZipPoints() {
  loading ??= import('../data/zipCentroids.json')
    .then((m) => { table = m.default ?? {}; return Object.keys(table).length > 0 })
    .catch(() => false)
  return loading
}

/** The participant's 5-digit ZIP, from its own field or the address text. */
export function zipOf(p) {
  const text = [p?.zip, p?.postalCode, p?.address].filter(Boolean).join(' ')
  return text.match(/\b(\d{5})(?:-\d{4})?\s*$/)?.[1] ?? text.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? null
}

/** { lat, lng } of the participant's ZIP centre, or null. */
export function zipPoint(p) {
  const c = table[zipOf(p)]
  return c ? { lat: c[0], lng: c[1] } : null
}
