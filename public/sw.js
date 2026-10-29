// Atlas service worker. It only lets browsers offer "Install app"; it caches nothing,
// so every page, booking and participant always comes fresh from the network.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
