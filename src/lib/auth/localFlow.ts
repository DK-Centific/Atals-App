// A stand-in for the Power Automate Auth flow, used while VITE_ATLAS_AUTH_URL is
// unset (localhost review). It follows the same contract and rules as the real
// flow (lockout, forced change, admin-only ops, bootstrap only while there is no admin) but
// keeps the users in this browser, so it is for trying the screens, not security.

import type { AtlasUser, AuthReply, AuthRequest, ModeratorSummary, Role, UserSummary } from './types.ts'

const KEY = 'atlas_local_users_v1'
const LOCK_AFTER = 5
const LOCK_MS = 15 * 60 * 1000
const TOKEN_MS = 12 * 60 * 60 * 1000
/** What "salt" answers for an unknown email, so the reply doesn't reveal who has an account. */
const FAKE_SALT = 'QXRsYXNVbmtub3duU2FsdA=='
const ROLES: Role[] = ['admin', 'scheduler', 'moderator']

interface StoredUser extends UserSummary {
  salt: string
  hash: string
  failedCount: number
  token: string | null
  tokenExpires: string | null
}

export interface LocalResult {
  status: number
  body: AuthReply
}

function load(): StoredUser[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as StoredUser[]
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function save(users: StoredUser[]): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(users)) } catch { /* storage off: lasts for this tab */ }
}

const pick = ({ email, displayName, role, shortName, mustChangePassword, certifiedAt }: StoredUser): AtlasUser =>
  ({ email, displayName, role, shortName: shortName ?? null, mustChangePassword, certifiedAt })

const summary = (u: StoredUser): UserSummary =>
  ({ ...pick(u), active: u.active, lastSignIn: u.lastSignIn, lockedUntil: u.lockedUntil })

const reply = (status: number, body: AuthReply): LocalResult => ({ status, body })
const refuse = (status: number, message: string): LocalResult => reply(status, { ok: false, message })
const newToken = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

const cleanShort = (shortName: string | null | undefined) => shortName?.trim() || null
const hasAdmin = (users: StoredUser[]) => users.some((u) => u.role === 'admin')

/** Seed accounts for localhost: added once each, never replacing an account that exists. */
export interface SeedAccount {
  email: string
  displayName: string
  shortName?: string
  role: Role
  salt: string
  hash: string
}

export function seedLocalUsers(seed: SeedAccount[]): number {
  const users = load()
  const fresh = seed.filter((s) => !users.some((u) => u.email === s.email.toLowerCase()))
  for (const s of fresh) {
    users.push({
      email: s.email.toLowerCase(), displayName: s.displayName, role: s.role, shortName: cleanShort(s.shortName), active: true,
      mustChangePassword: false, certifiedAt: null, lastSignIn: null, lockedUntil: null,
      salt: s.salt, hash: s.hash, failedCount: 0, token: null, tokenExpires: null,
    })
  }
  if (fresh.length) save(users)
  return fresh.length
}

/** Emails of the accounts this browser already has, so seeding only hashes what's missing. */
export const localEmails = (): string[] => load().map((u) => u.email)

export function localAuth(req: AuthRequest): LocalResult {
  const users = load()
  const now = Date.now()
  const find = (email: string) => users.find((u) => u.email === email.trim().toLowerCase())

  // TOKEN CHECK, as in the flow.
  const caller = (token: string): StoredUser | LocalResult => {
    const u = users.find((x) => x.token === token)
    if (!u || !u.active || !u.tokenExpires || Date.parse(u.tokenExpires) < now) return refuse(401, 'Please sign in again.')
    if (u.mustChangePassword && req.op !== 'change-password' && req.op !== 'signout') return refuse(403, 'Change your temp password first.')
    return u
  }
  const admin = (token: string): StoredUser | LocalResult => {
    const u = caller(token)
    if ('status' in u) return u
    return u.role === 'admin' ? u : refuse(403, 'Only an Admin can do that.')
  }

  switch (req.op) {
    case 'salt': {
      const u = find(req.email)
      // Seeded moderators don't count: setup stays open until there is an admin.
      return reply(200, { salt: u?.active ? u.salt : FAKE_SALT, empty: !hasAdmin(users) })
    }
    case 'signin': {
      const u = find(req.email)
      const wrong = 'Email or password is wrong, or the account is locked.'
      if (!u || !u.active || (u.lockedUntil && Date.parse(u.lockedUntil) > now)) return refuse(401, wrong)
      if (req.hash !== u.hash) {
        u.failedCount += 1
        if (u.failedCount >= LOCK_AFTER) { u.lockedUntil = new Date(now + LOCK_MS).toISOString(); u.failedCount = 0 }
        save(users)
        return refuse(401, wrong)
      }
      u.token = newToken()
      u.tokenExpires = new Date(now + TOKEN_MS).toISOString()
      u.failedCount = 0
      u.lockedUntil = null
      u.lastSignIn = new Date(now).toISOString()
      save(users)
      return reply(200, { ok: true, token: u.token, expiresAt: u.tokenExpires, user: pick(u) })
    }
    case 'change-password': {
      const u = caller(req.token)
      if ('status' in u) return u
      if (req.currentHash !== u.hash) return refuse(401, 'Your current password is wrong.')
      Object.assign(u, { salt: req.newSalt, hash: req.newHash, mustChangePassword: false })
      save(users)
      return reply(200, { ok: true, user: pick(u) })
    }
    case 'signout': {
      const u = users.find((x) => x.token === req.token)
      if (u) { u.token = null; u.tokenExpires = null; save(users) }
      return reply(200, { ok: true })
    }
    case 'user.list': {
      const a = admin(req.token)
      if ('status' in a) return a
      return reply(200, { ok: true, users: users.map(summary) })
    }
    case 'moderator.list': {
      const c = caller(req.token)
      if ('status' in c) return c
      const moderators: ModeratorSummary[] = users
        .filter((u) => u.role === 'moderator' && u.active)
        .map((u) => ({ email: u.email, displayName: u.displayName, shortName: u.shortName ?? null }))
      return reply(200, { ok: true, moderators })
    }
    case 'user.create': {
      const a = admin(req.token)
      if ('status' in a) return a
      const email = req.user.email.trim().toLowerCase()
      if (find(email)) return refuse(409, 'That email already has an account.')
      if (!ROLES.includes(req.user.role)) return refuse(400, 'Pick a role.')
      users.push({
        email, displayName: req.user.displayName.trim(), role: req.user.role, shortName: cleanShort(req.user.shortName), active: true,
        mustChangePassword: true, certifiedAt: null, lastSignIn: null, lockedUntil: null,
        salt: req.salt, hash: req.hash, failedCount: 0, token: null, tokenExpires: null,
      })
      save(users)
      return reply(200, { ok: true })
    }
    case 'user.update': {
      const a = admin(req.token)
      if ('status' in a) return a
      const u = find(req.email)
      if (!u) return refuse(404, 'No account with that email.')
      const { displayName, role, shortName, active } = req.changes
      if (u.email === a.email && (role !== undefined || active !== undefined)) return refuse(400, 'You can’t change your own role or turn yourself off.')
      if (role !== undefined) u.role = role
      if (shortName !== undefined) u.shortName = cleanShort(shortName)
      if (displayName !== undefined) u.displayName = displayName.trim()
      if (active !== undefined) { u.active = active; if (!active) { u.token = null; u.tokenExpires = null } }
      save(users)
      return reply(200, { ok: true })
    }
    case 'user.reset': {
      const a = admin(req.token)
      if ('status' in a) return a
      const u = find(req.email)
      if (!u) return refuse(404, 'No account with that email.')
      Object.assign(u, { salt: req.salt, hash: req.hash, mustChangePassword: true, failedCount: 0, lockedUntil: null, token: null, tokenExpires: null })
      save(users)
      return reply(200, { ok: true })
    }
    case 'bootstrap': {
      if (hasAdmin(users)) return refuse(403, 'Atlas already has an admin.')
      users.push({
        email: req.user.email.trim().toLowerCase(), displayName: req.user.displayName.trim(), role: 'admin', shortName: null,
        active: true, mustChangePassword: false, certifiedAt: null, lastSignIn: null, lockedUntil: null,
        salt: req.salt, hash: req.hash, failedCount: 0, token: null, tokenExpires: null,
      })
      save(users)
      return reply(200, { ok: true })
    }
    default:
      return refuse(400, 'Unknown request.')
  }
}
