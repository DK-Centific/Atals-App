// Filter model (ux-behavior-spec.md section 6): picks inside one group are OR
// (they widen), groups are AND (they narrow). Booked + Cancelled + Team Beta means
// "booked or cancelled, on Team Beta".

import { STATUS, TEAMS } from '../data/schedule.js'

export const FILTER_GROUPS = [
  {
    id: 'status',
    label: 'Status',
    options: ['booked', 'insession', 'completed', 'cancelled'].map((id) => ({ id, label: STATUS[id].label })),
  },
  {
    id: 'team',
    label: 'Team',
    options: TEAMS.map((t) => ({ id: t.id, label: `Team ${t.short}` })),
  },
]

export const optionLabel = (group, value) =>
  FILTER_GROUPS.find((g) => g.id === group)?.options.find((o) => o.id === value)?.label ?? value

const byGroup = (picks) => {
  const groups = new Map()
  for (const p of picks) {
    if (!groups.has(p.group)) groups.set(p.group, new Set())
    groups.get(p.group).add(p.value)
  }
  return groups
}

// `item` is a session, or a Month history chip ({ status }) with no team.
export function matches(picks, item) {
  for (const [group, values] of byGroup(picks)) {
    if (!values.has(item[group])) return false
  }
  return true
}

export const hasGroup = (picks, group) => picks.some((p) => p.group === group)
