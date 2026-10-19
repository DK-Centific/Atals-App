import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ScheduleProvider } from './state/ScheduleContext.jsx'
import { ToastProvider } from './motion/Toast.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScheduleProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ScheduleProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
