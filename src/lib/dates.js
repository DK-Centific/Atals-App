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

export const longDayLabel = (isoDate) => {
  const d = parse(isoDate)
  return `${DOW_LONG[d.getUTCDay()]}, ${MON_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`
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
