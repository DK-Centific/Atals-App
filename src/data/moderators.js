// Moderators: one per session. The real list is the active Moderator accounts
// (Admin > Users); this file only supplies the seed for localhost. The names,
// emails and test password live in the gitignored moderators.local.js, so when
// it is absent (a fresh clone, CI) placeholders stand in and the app still builds.

// Dev server only (npm run dev on localhost): a production build never bundles it.
const local = import.meta.env.DEV ? Object.values(import.meta.glob('./*.local.js', { eager: true }))[0] ?? {} : {}

/** [{ email, displayName, shortName? }] */
export const SEED_MODERATORS = local.MODERATORS ?? Array.from({ length: 8 }, (_, i) => ({
  email: `moderator${i + 1}@atlasapp.example`,
  displayName: `Moderator ${i + 1}`,
}))

/** The seed accounts' password; null without the local file, so nothing is seeded. */
export const SEED_PASSWORD = local.PASSWORD ?? null

/** Filter and Checklist value for bookings no moderator has been assigned to yet. */
export const UNASSIGNED = 'unassigned'

/** Sample sessions are spread round-robin across the seed moderators. */
export const seedModerator = (i) => SEED_MODERATORS[i % SEED_MODERATORS.length].email

/** The name shown on cards and pickers: the short name if set, else the first word. */
export const firstName = (m) => (m?.shortName?.trim() || m?.displayName?.trim().split(/\s+/)[0] || '')
