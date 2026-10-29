import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Root from './Root.jsx'
import { AuthProvider } from './state/AuthContext.tsx'
import { ToastProvider } from './motion/Toast.jsx'
import { installFit } from './lib/fit.js'
import { setUpInstall } from './lib/appInstall.js'
import './index.css'

installFit()
setUpInstall()

// GitHub Pages answers a direct link (e.g. /Atals-App/day/map) with 404.html, which keeps
// the path and sends the browser to this build's root; put the path back before routing.
try {
  const to = window.sessionStorage.getItem('atlas_redirect')
  if (to) {
    window.sessionStorage.removeItem('atlas_redirect')
    window.history.replaceState(null, '', to)
  }
} catch { /* storage off: the root page opens instead */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* basename follows the build's base path, e.g. /Atals-App/ on GitHub Pages. */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <ToastProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
