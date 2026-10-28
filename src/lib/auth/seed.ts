// Localhost only: with the sign-in stand-in (no VITE_ATLAS_AUTH_URL) and the
// gitignored moderators.local.js present, the seed moderators get accounts in
// this browser, hashed like any other password. Accounts already here are kept.

import { SEED_MODERATORS, SEED_PASSWORD } from '../../data/moderators.js'
import { saltedHash } from './crypto.ts'
import { localEmails, seedLocalUsers } from './localFlow.ts'

let seeding: Promise<void> | null = null

/** Runs once per page load; sign-in waits for it so a seeded account works at once. */
export function ensureSeed(): Promise<void> {
  seeding ??= (async () => {
    if (!SEED_PASSWORD) return
    const have = new Set(localEmails())
    const missing = SEED_MODERATORS.filter((m: { email: string }) => !have.has(m.email.toLowerCase()))
    if (!missing.length) return
    const accounts = await Promise.all(missing.map(async (m: { email: string; displayName: string; shortName?: string }) => ({
      ...m, role: 'moderator' as const, ...(await saltedHash(SEED_PASSWORD as string)),
    })))
    seedLocalUsers(accounts)
  })().catch(() => { /* storage off: no seed accounts this time */ })
  return seeding
}
