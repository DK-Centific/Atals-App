// Billing rules (Atlas cost tracker, Oct meetings): only Completed sessions are
// billable. Billable hours are a completed session's scheduled length; mileage is
// the round trip HQ -> participant -> HQ, reimbursed per mile.

import { toMinutes } from '../data/schedule.js'

export const MILEAGE_RATE = 0.725 // USD per mile
export const HOURLY_RATE = 25 // USD per moderator hour

export const isBillable = (s) => s.status === 'completed'

/** Scheduled length in hours, whatever the status. */
export const sessionHours = (s) => Math.max(0, toMinutes(s.end) - toMinutes(s.start)) / 60

/** Hours that count for billing: completed sessions only. */
export const billableHours = (s) => (isBillable(s) ? sessionHours(s) : 0)

export const formatHours = (h) => `${Number.isInteger(h) ? h : h.toFixed(h < 10 ? 2 : 1).replace(/0$/, '')} h`

export const formatUsd = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
