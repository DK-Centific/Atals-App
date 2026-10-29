// Which OneForma environment Atlas talks to, and how. No credentials live here or
// anywhere in the browser: the callback token sits in the Power Automate action flow.
//
// .env.local (never committed):
//   VITE_OF_ENV=uat | prod         default uat
//   VITE_ATLAS_ACTION_URL=...      Power Automate "Atlas action" flow (POST). Unset = dry run.
//   VITE_ATLAS_READ_URL=...        Power Automate read flow (POST with the session token). Unset = sample data.
//   VITE_ATLAS_AUTH_URL=...        Power Automate Auth flow (sign-in and users). Unset = users kept in this browser.
//   VITE_ATLAS_AUTH_FAST_URL=...   Optional faster flow for salt + signin only.
//   VITE_CHECKLIST_URL=...         Checklist app address; each booking links to it with ?booking=<id>.

export type OneFormaEnv = 'uat' | 'prod'

// OneForma projectIds (guide section 1). UAT is a separate test project.
const PROJECT_IDS: Record<OneFormaEnv, string> = {
  uat: '1836058778114049',
  prod: '1835020160944129',
}

const env: OneFormaEnv = import.meta.env.VITE_OF_ENV === 'prod' ? 'prod' : 'uat'

export const OF_ENV = env
export const OF_PROJECT_ID = PROJECT_IDS[env]
export const SOURCE_SYSTEM = 'atlas'
export const TIMEZONE = 'America/Los_Angeles'
export const RECORDING_PROVIDER = 'client-app'

const DEMO_KEY = 'atlas_demo_v1'

function readDemo(): boolean {
  try { return window.localStorage.getItem(DEMO_KEY) === 'on' } catch { return false }
}

/**
 * Demo data (per browser, Admin > account menu): sample participants and schedule, and
 * nothing leaves this browser. No SharePoint save, no OneForma event, no email. Sign-in
 * stays real. Read once at load; switching reloads the page.
 */
export const DEMO = readDemo()

export function setDemo(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(DEMO_KEY, 'on')
    else window.localStorage.removeItem(DEMO_KEY)
  } catch { /* storage off: stays as it is */ }
  window.location.reload()
}

/**
 * This build's storage key. Prod and UAT are served from the same site (UAT under /uat/),
 * so they share this browser's storage: Prod gets its own keys, so a UAT change waiting
 * to be sent can never go out through the Prod flows. Demo data gets its own keys too.
 */
export const storageKey = (base: string): string => `${base}${env === 'prod' ? '_prod' : ''}${DEMO ? '_demo' : ''}`

export const ACTION_URL: string | undefined = DEMO ? undefined : import.meta.env.VITE_ATLAS_ACTION_URL || undefined
export const READ_URL: string | undefined = DEMO ? undefined : import.meta.env.VITE_ATLAS_READ_URL || undefined
export const AUTH_URL: string | undefined = import.meta.env.VITE_ATLAS_AUTH_URL || undefined
/** Optional lighter Auth flow for op salt and signin only (faster sign-in); the rest uses AUTH_URL. */
export const AUTH_FAST_URL: string | undefined = import.meta.env.VITE_ATLAS_AUTH_FAST_URL || undefined
export const CHECKLIST_URL: string | undefined = import.meta.env.VITE_CHECKLIST_URL || undefined

/** Dry run: actions are built and checked but never leave the browser. */
export const DRY_RUN = !ACTION_URL
