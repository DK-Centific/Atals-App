import App from './App.jsx'
import DemoBanner from './components/DemoBanner.jsx'
import SignInView from './views/SignInView.jsx'
import { useAuth } from './state/AuthContext.tsx'
import { RoleProvider } from './state/RoleContext.jsx'
import { SyncProvider } from './state/SyncContext.tsx'
import { ScheduleProvider } from './state/ScheduleContext.jsx'
import { ParticipantProvider } from './state/ParticipantContext.jsx'
import { FilterProvider } from './state/FilterContext.jsx'
import { MapProvider } from './state/MapContext.jsx'
import { ModeratorProvider } from './state/ModeratorContext.jsx'
import UpdateNotice, { UpdateProvider } from './components/UpdateNotice.jsx'
import Tour from './tour/Tour.jsx'
import { TourProvider } from './tour/TourContext.jsx'

// Sign-in first. Once signed in, the data providers mount for that person;
// keyed by email, so the next person on this device starts clean.
export default function Root() {
  const { stage, user } = useAuth()
  if (stage === 'checking') return null
  if (stage !== 'signedIn' || !user) return <SignInView />

  return (
    <RoleProvider>
      <ModeratorProvider key={user.email}>
        <SyncProvider key={user.email}>
          <ScheduleProvider>
            <ParticipantProvider>
              <FilterProvider>
                <MapProvider>
                  <TourProvider>
                    <UpdateProvider>
                      <DemoBanner />
                      <App />
                      <Tour />
                      <UpdateNotice />
                    </UpdateProvider>
                  </TourProvider>
                </MapProvider>
              </FilterProvider>
            </ParticipantProvider>
          </ScheduleProvider>
        </SyncProvider>
      </ModeratorProvider>
    </RoleProvider>
  )
}
