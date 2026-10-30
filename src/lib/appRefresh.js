// Load the newest Atlas: refetch the page past the browser cache, check for a new
// service worker, clear any caches, then reload. Sign-in and saved data stay.
export async function hardRefresh() {
  try {
    await Promise.allSettled([
      fetch(window.location.href, { cache: 'reload' }),
      navigator.serviceWorker?.getRegistration().then((r) => r?.update()),
      window.caches?.keys().then((keys) => Promise.all(keys.map((k) => window.caches.delete(k)))),
    ])
  } finally {
    window.location.reload()
  }
}
