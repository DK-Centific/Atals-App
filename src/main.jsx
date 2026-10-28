import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Root from './Root.jsx'
import { AuthProvider } from './state/AuthContext.tsx'
import { ToastProvider } from './motion/Toast.jsx'
import { installFit } from './lib/fit.js'
import './index.css'

installFit()

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
