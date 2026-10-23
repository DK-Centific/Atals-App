// Fit scaling (ux-behavior-spec.md section 10). Atlas is designed for 1536 x 864;
// smaller windows scale the whole UI through the root font size, never above 1.
// Phones (under 640px) keep 16px and use the stacked phone layout instead.

const BASE_W = 1536
const BASE_H = 864
const PHONE = 640

function hostWindow() {
  // Inside a same-origin host page, size by the top window so it doesn't shrink twice.
  try {
    if (window.top !== window && window.top.innerWidth) return window.top
  } catch {
    // Cross-origin host: use our own window.
  }
  return window
}

export function fitScale(w, h) {
  if (w < PHONE) return 1
  const s = Math.min(1, Math.max(0.8, Math.min(w / BASE_W, h / BASE_H)))
  return Math.round(s * 1000) / 1000
}

export function installFit() {
  const root = document.documentElement
  let raf = 0
  const apply = () => {
    raf = 0
    const win = hostWindow()
    const s = fitScale(win.innerWidth, win.innerHeight)
    root.style.fontSize = `${16 * s}px`
    root.style.setProperty('--fit', String(s))
  }
  apply()
  window.addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(apply) })
}
