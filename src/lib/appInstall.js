// Installing Atlas as an app (PWA). The browser's install offer is kept so the account
// menu can show "Install app"; iPhone Safari has no offer, so it gets the Share-menu steps.

const BASE = import.meta.env.BASE_URL
let offer = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

export function setUpInstall() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); offer = e; notify() })
  window.addEventListener('appinstalled', () => { offer = null; notify() })
  // Production only: the dev server reloads by itself.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE }).catch(() => { /* not installable here; the app still works */ })
  }
}

export const onInstallChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

export const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** 'prompt' (the browser can install), 'ios' (Share > Add to Home Screen), or null. */
export const installMode = () => (isInstalled() ? null : offer ? 'prompt' : isIos() ? 'ios' : null)

export async function promptInstall() {
  if (!offer) return false
  const e = offer
  offer = null
  notify()
  await e.prompt()
  return (await e.userChoice)?.outcome === 'accepted'
}

// Admins install "Atlas Admin" with its own icon; everyone else gets "Atlas".
export function setAppIdentity(isAdmin) {
  const name = isAdmin ? 'Atlas Admin' : 'Atlas'
  const set = (id, attr, value) => { const el = document.getElementById(id); if (el && el.getAttribute(attr) !== value) el.setAttribute(attr, value) }
  set('atlas-manifest', 'href', `${BASE}${isAdmin ? 'manifest-admin.webmanifest' : 'manifest.webmanifest'}`)
  set('atlas-touch-icon', 'href', `${BASE}icons/${isAdmin ? 'apple-touch-icon-admin.png' : 'apple-touch-icon.png'}`)
  set('atlas-app-title', 'content', name)
}
