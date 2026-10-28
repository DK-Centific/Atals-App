// Which OneForma environment Atlas talks to, and how. No credentials live here or
// anywhere in the browser: the callback token sits in the Power Automate action flow.
//
// .env.local (never committed):
//   VITE_OF_ENV=uat | prod         default uat
//   VITE_ATLAS_ACTION_URL=...      Power Automate "Atlas action" flow (POST). Unset = dry run.
//   VITE_ATLAS_READ_URL=...        Power Automate read flow (POST with the session token). Unset = sample data.
//   VITE_ATLAS_AUTH_URL=...        Power Automate Auth flow (sign-in and users). Unset = users kept in this browser.
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

export const ACTION_URL: string | undefined = import.meta.env.VITE_ATLAS_ACTION_URL || undefined
export const READ_URL: string | undefined = import.meta.env.VITE_ATLAS_READ_URL || undefined
export const AUTH_URL: string | undefined = import.meta.env.VITE_ATLAS_AUTH_URL || undefined
export const CHECKLIST_URL: string | undefined = import.meta.env.VITE_CHECKLIST_URL || undefined

/** Dry run: actions are built and checked but never leave the browser. */
export const DRY_RUN = !ACTION_URL
