import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ScheduleProvider } from './state/ScheduleContext.jsx'
import { FilterProvider } from './state/FilterContext.jsx'
import { ToastProvider } from './motion/Toast.jsx'
import { installFit } from './lib/fit.js'
import './index.css'

installFit()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ScheduleProvider>
          <FilterProvider>
            <App />
          </FilterProvider>
        </ScheduleProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
