// Date helpers. Dates are ISO strings ('2024-10-24') handled in UTC so the
// calendar never shifts with the viewer's timezone.

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const parse = (iso) => new Date(`${iso}T00:00:00Z`)
export const iso = (d) => d.toISOString().slice(0, 10)
export const addDays = (isoDate, n) => {
  const d = parse(isoDate)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

// Monday of the week containing `isoDate`.
export const startOfWeek = (isoDate) => {
  const dow = (parse(isoDate).getUTCDay() + 6) % 7
  return addDays(isoDate, -dow)
}

export const weekOf = (isoDate) => {
  const monday = startOfWeek(isoDate)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    const d = parse(date)
    return { date, dow: DOW_SHORT[d.getUTCDay()], day: d.getUTCDate() }
  })
}

export const shortDate = (isoDate) => {
  const d = parse(isoDate)
  return `${MON_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export const weekRangeLabel = (week) => `${shortDate(week[0].date)} - ${shortDate(week[6].date)}`

// 12-hour clock for people: '13:05' -> '1:05 PM'.
export const clock12 = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// A time range on one line, AM/PM once when both ends share it: '8:00 – 8:45 AM'.
export const timeRange = (start, end) => {
  if (!end) return clock12(start)
  const sameHalf = (Number(start.slice(0, 2)) < 12) === (Number(end.slice(0, 2)) < 12)
  return `${sameHalf ? clock12(start).slice(0, -3) : clock12(start)} – ${clock12(end)}`
}

// An hour on the week rail: 8 -> '8 AM', 13 -> '1 PM'.
export const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`

export const longDayLabel = (isoDate) => {
  const d = parse(isoDate)
  return `${DOW_LONG[d.getUTCDay()]}, ${MON_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`
}

// The full day for headers: 'Thursday, October 24'.
export const fullDayLabel = (isoDate) => {
  const d = parse(isoDate)
  return `${DOW_LONG[d.getUTCDay()]}, ${MON_LONG[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export const monthTitle = (year, month) => `${MON_LONG[month]} ${year}`

// Monday-first grid of whole weeks covering the month. month is 0-based.
export const monthGrid = (year, month) => {
  const first = iso(new Date(Date.UTC(year, month, 1)))
  const last = iso(new Date(Date.UTC(year, month + 1, 0)))
  const start = startOfWeek(first)
  const end = addDays(startOfWeek(last), 6)
  const cells = []
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const d = parse(date)
    cells.push({ date, day: d.getUTCDate(), other: d.getUTCMonth() !== month })
  }
  return cells
}
