import { createContext, useCallback, useContext, useState } from 'react'
import useAutoDismiss from './useAutoDismiss.js'
import { prefersReducedMotion } from './motion.js'

// Toast at the bottom centre (spec section 8): stays 6s, pauses while hovered
// or focused, can be closed by hand, enters 240ms and leaves 180ms the way it came.
const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [leaving, setLeaving] = useState(false)

  const show = useCallback((message, tone = 'info') => {
    setLeaving(false)
    setToast({ message, tone, key: `${Date.now()}-${Math.random()}` })
  }, [])

  // Mark leaving first, play the exit, then unmount on animationend.
  const dismiss = useCallback(() => {
    if (prefersReducedMotion()) setToast(null)
    else setLeaving(true)
  }, [])

  const hold = useAutoDismiss(dismiss, leaving ? null : toast?.key)

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.key}
          role="status"
          aria-live="polite"
          className={`atlas-toast atlas-toast--${toast.tone}`}
          data-state={leaving ? 'closing' : 'open'}
          onAnimationEnd={(e) => { if (leaving && e.target === e.currentTarget) setToast(null) }}
          {...hold}
        >
          <span className={`atlas-status-dot ${toast.tone === 'error' ? 'atlas-status-dot--cancelled' : 'atlas-status-dot--insession'}`} />
          <span className="atlas-toast-text">{toast.message}</span>
          <button type="button" className="atlas-toast-close" aria-label="Dismiss notification" onClick={dismiss}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
