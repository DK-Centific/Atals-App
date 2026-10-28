// Filter model (ux-behavior-spec.md section 6): picks inside one group are OR
// (they widen), groups are AND (they narrow). Booked + Cancelled + Bimo means
// "booked or cancelled, moderated by Bimo".

import { STATUS } from '../data/schedule.js'
import { UNASSIGNED, firstName } from '../data/moderators.js'

// Status is fixed; Moderator lists Unassigned, then the active moderators (useFilterGroups).
export const filterGroups = (moderators) => [
  {
    id: 'status',
    label: 'Status',
    options: ['booked', 'insession', 'completed', 'cancelled'].map((id) => ({ id, label: STATUS[id].label })),
  },
  {
    id: 'moderator',
    label: 'Moderator',
    options: [
      { id: UNASSIGNED, label: 'Unassigned', title: 'Bookings waiting for an Admin to assign a moderator' },
      ...moderators.map((m) => ({ id: m.email, label: firstName(m), title: m.displayName })),
    ],
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

// A session with moderator '' is Unassigned. A Month history chip ({ status }) has no
// moderator at all, so any moderator pick (Unassigned included) leaves it out.
const valueOf = (item, group) =>
  group === 'moderator' && item.moderator === '' ? UNASSIGNED : item[group]

// `item` is a session, or a Month history chip ({ status }) with no moderator.
export function matches(picks, item) {
  for (const [group, values] of byGroup(picks)) {
    if (!values.has(valueOf(item, group))) return false
  }
  return true
}

export const hasGroup = (picks, group) => picks.some((p) => p.group === group)
