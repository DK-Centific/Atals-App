// Date range for the Map view. Ranges are inclusive ISO dates ({ from, to }),
// and a preset recomputes from TODAY so "This week" always means this week.

import { TODAY } from '../data/schedule.js'
import { addDays, iso, parse, shortDate, startOfWeek } from './dates.js'

export const RANGE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week', label: 'This week' },
  { id: 'next7', label: 'Next 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
]

export function rangeFor(preset, today = TODAY) {
  if (preset === 'tomorrow') return { from: addDays(today, 1), to: addDays(today, 1) }
  if (preset === 'week') return { from: startOfWeek(today), to: addDays(startOfWeek(today), 6) }
  if (preset === 'next7') return { from: today, to: addDays(today, 6) }
  if (preset === 'month') {
    const d = parse(today)
    return {
      from: iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))),
      to: iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))),
    }
  }
  return { from: today, to: today }
}

export const inRange = (range, date) => date >= range.from && date <= range.to

export const rangeLabel = ({ from, to }) => (from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`)
