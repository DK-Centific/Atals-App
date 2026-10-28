// Timestamps OneForma accepts: ISO 8601 with an explicit offset (guide section 5).

// Minutes `timeZone` is ahead of UTC at instant `ms`.
function offsetMinutes(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms))
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000)
}

const pad = (n: number) => String(Math.abs(n)).padStart(2, '0')

/** Wall-clock `date` + `time` in `timeZone` as "2024-10-24T17:00:00-07:00". */
export function zonedIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const wall = Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
  // Two passes settle the offset on DST change days.
  let offset = offsetMinutes(wall, timeZone)
  offset = offsetMinutes(wall - offset * 60000, timeZone)
  const sign = offset < 0 ? '-' : '+'
  return `${date}T${pad(hh ?? 0)}:${pad(mm ?? 0)}:00${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
}

/** Now, in UTC ISO ("...Z" is an explicit offset). */
export const nowIso = (): string => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
