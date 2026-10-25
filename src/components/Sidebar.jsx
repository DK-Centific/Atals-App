import { useState } from 'react'
import {
  CalendarIcon, CalendarSquareIcon, DashboardIcon, LogoIcon, ParticipantsIcon,
  SettingsIcon, TeamsIcon, TeamsSimpleIcon,
} from './Icons.jsx'
import RoleSwitch from './RoleSwitch.jsx'

// The Day and Week designs share one rail; the Month design has its own
// ordering and an avatar at the bottom. `variant` picks between them.
const RAILS = {
  default: {
    nav: [
      { id: 'dashboard', title: 'Dashboard', Icon: DashboardIcon },
      { id: 'schedule', title: 'Schedule', Icon: CalendarIcon },
      { id: 'teams', title: 'Teams', Icon: TeamsIcon },
      { id: 'participants', title: 'Participants', Icon: ParticipantsIcon },
    ],
    footer: [{ id: 'settings', title: 'Settings', Icon: SettingsIcon }],
  },
  month: {
    nav: [
      { id: 'schedule', title: 'Schedule', Icon: CalendarSquareIcon },
      { id: 'dashboard', title: 'Dashboard', Icon: DashboardIcon },
      { id: 'teams', title: 'Teams', Icon: TeamsSimpleIcon },
      { id: 'settings', title: 'Settings', Icon: SettingsIcon },
    ],
    footer: [],
  },
}

export default function Sidebar({ variant = 'default' }) {
  const rail = RAILS[variant]
  const [active, setActive] = useState(rail.nav[0].id)

  const renderItem = ({ id, title, Icon }) => (
    <button
      key={id}
      type="button"
      className={`atlas-rail-item${active === id ? ' is-active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active === id}
      onClick={() => setActive(id)}
    >
      <Icon />
    </button>
  )

  return (
    <aside className="atlas-sidebar atlas-raised">
      <div className="atlas-sidebar-brand">
        <div className="atlas-sidebar-logo atlas-well-sm">
          <LogoIcon />
        </div>
      </div>

      <nav className="atlas-sidebar-nav">
        {rail.nav.map(renderItem)}
      </nav>

      <div className="atlas-sidebar-footer">
        {rail.footer.map(renderItem)}
        <RoleSwitch />
      </div>
    </aside>
  )
}
