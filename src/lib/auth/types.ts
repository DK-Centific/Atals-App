// Sign-in types. These mirror the Power Automate Auth flow contract in
// oneforma/pa-bot-instructions-v3-signin.md: the flow stores only a salt and a
// PBKDF2 hash, never a password, and answers every call as JSON.

export type Role = 'admin' | 'scheduler' | 'moderator'

/** The signed-in person, as the flow returns it after sign-in. */
export interface AtlasUser {
  email: string
  displayName: string
  role: Role
  /** What cards and pickers call them; empty means the first word of displayName. */
  shortName: string | null
  mustChangePassword: boolean
  certifiedAt: string | null
}

/** A bookable moderator, as anyone signed in may see them. */
export interface ModeratorSummary {
  email: string
  displayName: string
  shortName: string | null
}

/** One row of the Admin > Users table. Hashes, salts and tokens never reach the app. */
export interface UserSummary extends AtlasUser {
  active: boolean
  lastSignIn: string | null
  lockedUntil: string | null
}

export interface AuthSession {
  token: string
  expiresAt: string
  user: AtlasUser
}

export interface NewUser {
  email: string
  displayName: string
  role: Role
  shortName: string | null
}

export interface UserChanges {
  displayName?: string
  role?: Role
  shortName?: string | null
  active?: boolean
}

/** Everything the Auth flow accepts, by op. */
export type AuthRequest =
  | { op: 'salt'; email: string }
  | { op: 'signin'; email: string; hash: string }
  | { op: 'change-password'; token: string; currentHash: string; newSalt: string; newHash: string }
  | { op: 'signout'; token: string }
  | { op: 'user.list'; token: string }
  /** Active moderators, for anyone signed in (schedulers need them to book). */
  | { op: 'moderator.list'; token: string }
  | { op: 'user.create'; token: string; user: NewUser; salt: string; hash: string }
  | { op: 'user.update'; token: string; email: string; changes: UserChanges }
  | { op: 'user.reset'; token: string; email: string; salt: string; hash: string }
  | { op: 'bootstrap'; user: { email: string; displayName: string }; salt: string; hash: string }

export interface AuthReply {
  ok?: boolean
  message?: string | null
  salt?: string
  token?: string
  expiresAt?: string
  user?: AtlasUser
  users?: UserSummary[]
  moderators?: ModeratorSummary[]
  /** Only the browser-kept stand-in says this: no users yet, so the first admin can be set up. */
  empty?: boolean
}

export class AuthError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
