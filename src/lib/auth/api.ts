// Talks to the Power Automate Auth flow (VITE_ATLAS_AUTH_URL). Without it the
// browser-kept stand-in answers instead, with the same contract.

import { AUTH_FAST_URL, AUTH_URL } from '../oneforma/config.ts'
import { hashPassword, saltedHash } from './crypto.ts'
import { localAuth } from './localFlow.ts'
import { ensureSeed } from './seed.ts'
import { AuthError } from './types.ts'
import type { AuthReply, AuthRequest, AuthSession, ModeratorSummary, NewUser, Role, UserChanges, UserSummary } from './types.ts'

const TIMEOUT_MS = 20000

/** True while sign-in runs on the browser-kept stand-in (no Auth flow set). */
export const LOCAL_AUTH = !AUTH_URL

async function call(req: AuthRequest): Promise<AuthReply> {
  if (!AUTH_URL) {
    // A short wait so the screens behave as they will against the real flow,
    // and the localhost seed accounts are in place before anyone signs in.
    await Promise.all([new Promise((r) => setTimeout(r, 250)), ensureSeed()])
    const { status, body } = localAuth(req)
    if (status >= 300) throw new AuthError(status, body.message ?? 'That didn’t work.')
    return body
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    // salt and signin may go to the lighter Auth flow; everything else to the main one.
    const url = AUTH_FAST_URL && (req.op === 'salt' || req.op === 'signin') ? AUTH_FAST_URL : AUTH_URL
    const res = await fetch(url, {
      method: 'POST',
      // text/plain: the flows' HTTP trigger answers no CORS preflight, which
      // application/json would trigger; it also keeps timestamps exactly as sent.
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ schemaVersion: 1, ...req }),
      signal: ctrl.signal,
    })
    let body: AuthReply = {}
    try { body = await res.json() as AuthReply } catch { /* no body: go by the status */ }
    if (!res.ok) throw new AuthError(res.status, body.message ?? `Sign-in service answered ${res.status}`)
    return body
  } catch (err) {
    if (err instanceof AuthError) throw err
    throw new AuthError(0, 'Couldn’t reach the sign-in service. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }
}

const clean = (email: string) => email.trim().toLowerCase()

// Each Auth flow call takes a few seconds, and sign-in needs the salt before it can
// hash. So the sign-in screen asks for the salt as soon as the email looks complete
// (prefetchSalt), while the password is still being typed; pressing Sign in then
// costs one call, not two. Salts are not secret (unknown emails get a fake one).
// Kept for this page only.
const LOOKS_LIKE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/
const salts = new Map<string, Promise<string>>()

export function prefetchSalt(email: string): void {
  const e = clean(email)
  if (!LOOKS_LIKE_EMAIL.test(e) || salts.has(e)) return
  const p = call({ op: 'salt', email: e }).then(({ salt }) => {
    if (!salt) throw new AuthError(500, 'The sign-in service gave no salt.')
    return salt
  })
  p.catch(() => salts.delete(e))
  salts.set(e, p)
}

function saltFor(email: string): Promise<string> {
  prefetchSalt(email)
  return salts.get(clean(email)) ?? call({ op: 'salt', email: clean(email) }).then(({ salt }) => {
    if (!salt) throw new AuthError(500, 'The sign-in service gave no salt.')
    return salt
  })
}

// The Auth flow names roles 'Admin' | 'Scheduler' | 'Moderator'; the app uses lowercase ids.
const fromFlowRole = (role: string): Role => role.toLowerCase() as Role
const toFlowRole = (role: Role): string => (AUTH_URL ? role.charAt(0).toUpperCase() + role.slice(1) : role)
const withRole = <T extends { role: string }>(u: T): T => ({ ...u, role: fromFlowRole(u.role) })

/**
 * Whether to show first-run setup. The stand-in knows when there are no accounts;
 * the real flow never says, so there the screen is opened by hand with /?setup=1
 * (the flow refuses bootstrap once any user exists).
 */
export async function needsSetup(): Promise<boolean> {
  if (!LOCAL_AUTH) return new URLSearchParams(window.location.search).has('setup')
  const r = await call({ op: 'salt', email: '' })
  return Boolean(r.empty)
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const salt = await saltFor(email)
  let r: AuthReply
  try {
    r = await call({ op: 'signin', email: clean(email), hash: await hashPassword(password, salt) })
  } catch (err) {
    // The salt may be stale (an Admin reset the password since): ask afresh next time.
    salts.delete(clean(email))
    throw err
  }
  if (!r.token || !r.expiresAt || !r.user) throw new AuthError(500, 'The sign-in service gave an incomplete answer.')
  return { token: r.token, expiresAt: r.expiresAt, user: withRole(r.user) }
}

export async function changePassword(token: string, email: string, current: string, next: string): Promise<void> {
  // Reuses the salt from sign-in, so this is one Auth call.
  const salt = await saltFor(email)
  const fresh = await saltedHash(next)
  await call({ op: 'change-password', token, currentHash: await hashPassword(current, salt), newSalt: fresh.salt, newHash: fresh.hash })
  salts.set(clean(email), Promise.resolve(fresh.salt))
}

export async function signOut(token: string): Promise<void> {
  await call({ op: 'signout', token })
}

export async function bootstrap(email: string, displayName: string, password: string): Promise<void> {
  const { salt, hash } = await saltedHash(password)
  await call({ op: 'bootstrap', user: { email: clean(email), displayName }, salt, hash })
}

export async function listUsers(token: string): Promise<UserSummary[]> {
  const r = await call({ op: 'user.list', token })
  return (r.users ?? []).map(withRole)
}

/** Active moderators, for booking. Anyone signed in may ask. */
export async function listModerators(token: string): Promise<ModeratorSummary[]> {
  const r = await call({ op: 'moderator.list', token })
  return r.moderators ?? []
}

/** Creates the account with a temp password; the caller shows it to the admin once. */
export async function createUser(token: string, user: NewUser, temp: string): Promise<void> {
  const { salt, hash } = await saltedHash(temp)
  await call({ op: 'user.create', token, user: { ...user, email: clean(user.email), role: toFlowRole(user.role) as Role }, salt, hash })
}

export async function updateUser(token: string, email: string, changes: UserChanges): Promise<void> {
  await call({ op: 'user.update', token, email, changes: changes.role ? { ...changes, role: toFlowRole(changes.role) as Role } : changes })
}

export async function resetUser(token: string, email: string, temp: string): Promise<void> {
  const { salt, hash } = await saltedHash(temp)
  await call({ op: 'user.reset', token, email, salt, hash })
}
