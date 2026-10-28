// Filter model (ux-behavior-spec.md section 6): picks inside one group are OR
// (they widen), groups are AND (they narrow). Booked + Cancelled + Bimo means
// "booked or cancelled, moderated by Bimo".

import { STATUS } from '../data/schedule.js'
import { firstName } from '../data/moderators.js'

// Status is fixed; Moderator lists the active moderators (useFilterGroups).
export const filterGroups = (moderators) => [
  {
    id: 'status',
    label: 'Status',
    options: ['booked', 'insession', 'completed', 'cancelled'].map((id) => ({ id, label: STATUS[id].label })),
  },
  {
    id: 'moderator',
    label: 'Moderator',
    options: moderators.map((m) => ({ id: m.email, label: firstName(m), title: m.displayName })),
  },
]

export const optionLabel = (groups, group, value) =>
  groups.find((g) => g.id === group)?.options.find((o) => o.id === value)?.label ?? value

const byGroup = (picks) => {
  const groups = new Map()
  for (const p of picks) {
    if (!groups.has(p.group)) groups.set(p.group, new Set())
    groups.get(p.group).add(p.value)
  }
  return groups
}

// `item` is a session, or a Month history chip ({ status }) with no moderator.
export function matches(picks, item) {
  for (const [group, values] of byGroup(picks)) {
    if (!values.has(item[group])) return false
  }
  return true
}

export const hasGroup = (picks, group) => picks.some((p) => p.group === group)
