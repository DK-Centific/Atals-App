import { useLocation } from 'react-router-dom'
import {
  CalendarIcon, CalendarSquareIcon, DashboardIcon, LogoIcon, ParticipantsIcon, TeamsIcon,
} from './Icons.jsx'
import AccountMenu from './AccountMenu.jsx'
import RefreshRailButton from './RefreshRailButton.jsx'
import { VERSION } from '../version.js'
import SyncRailButton from './sync/SyncRailButton.jsx'
import useViewNavigate from '../motion/useViewNavigate.js'
import { useRole } from '../state/RoleContext.jsx'

// The Admin app's rail. Every item is a place in the app; what shows depends on
// the role (Scheduler: Schedule only; Admin: Schedule, Checklist, Users, Tracker).
// The Month design orders the same items differently (`variant`).
const ITEMS = {
  schedule: { title: 'Schedule', path: '/day', match: ['/day', '/week', '/month'], roles: ['admin', 'scheduler'] },
  checklist: { title: 'Checklist', path: '/checklist', match: ['/checklist'], roles: ['admin'], Icon: TeamsIcon },
  users: { title: 'Users', path: '/admin/users', match: ['/admin/users'], roles: ['admin'], Icon: ParticipantsIcon },
  tracker: { title: 'Production tracker', path: '/admin/tracker', match: ['/admin/tracker'], roles: ['admin'], Icon: DashboardIcon },
}

const ORDER = {
  default: ['schedule', 'checklist', 'users', 'tracker'],
  month: ['schedule', 'tracker', 'checklist', 'users'],
}

export default function Sidebar({ variant = 'default' }) {
  const { pathname } = useLocation()
  const goTo = useViewNavigate()
  const { role } = useRole()
  const items = ORDER[variant].map((id) => ({ id, ...ITEMS[id] })).filter((i) => i.roles.includes(role))

  return (
    <aside className="atlas-sidebar atlas-raised">
      <div className="atlas-sidebar-brand">
        <div className="atlas-sidebar-logo atlas-well-sm">
          <LogoIcon />
        </div>
      </div>

      <nav className="atlas-sidebar-nav" aria-label="Atlas">
        {items.map(({ id, title, path, match, Icon }) => {
          const active = match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
          const RailIcon = Icon ?? (variant === 'month' ? CalendarSquareIcon : CalendarIcon)
          return (
            <button
              key={id}
              type="button"
              className={`atlas-rail-item${active ? ' is-active' : ''}${path ? '' : ' is-soon'}`}
              title={title}
              aria-label={title}
              aria-current={active ? 'page' : undefined}
              disabled={!path}
              onClick={() => { if (path && !active) goTo(path) }}
            >
              <RailIcon />
            </button>
          )
        })}
      </nav>

      <div className="atlas-sidebar-footer">
        <RefreshRailButton />
        <SyncRailButton />
        <AccountMenu />
        <span className="atlas-version atlas-sidebar-version" title={`Atlas ${VERSION}`}>v{VERSION}</span>
      </div>
    </aside>
  )
}
