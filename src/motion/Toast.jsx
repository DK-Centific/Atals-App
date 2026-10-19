import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Twilight-style toast: slides up from the bottom centre, holds, then slides away.
const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [shown, setShown] = useState(false)
  const timers = useRef([])

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const show = useCallback((message, tone = 'info') => {
    clear()
    setToast({ message, tone, key: Date.now() })
    setShown(false)
    // Next frame so the enter transition runs even when replacing a visible toast.
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    timers.current.push(setTimeout(() => setShown(false), 3200))
    timers.current.push(setTimeout(() => setToast(null), 3600))
  }, [])

  useEffect(() => clear, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div role="status" aria-live="polite" className={`atlas-toast atlas-toast--${toast.tone}${shown ? ' is-show' : ''}`}>
          <span className={`atlas-status-dot ${toast.tone === 'error' ? 'atlas-status-dot--cancelled' : 'atlas-status-dot--insession'}`} />
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
