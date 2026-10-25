import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ScheduleProvider } from './state/ScheduleContext.jsx'
import { FilterProvider } from './state/FilterContext.jsx'
import { MapProvider } from './state/MapContext.jsx'
import { ParticipantProvider } from './state/ParticipantContext.jsx'
import { RoleProvider } from './state/RoleContext.jsx'
import { ToastProvider } from './motion/Toast.jsx'
import { installFit } from './lib/fit.js'
import './index.css'

installFit()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <RoleProvider>
          <ScheduleProvider>
            <ParticipantProvider>
              <FilterProvider>
                <MapProvider>
                  <App />
                </MapProvider>
              </FilterProvider>
            </ParticipantProvider>
          </ScheduleProvider>
        </RoleProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
