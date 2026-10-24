import { ROLES, useRole } from '../state/RoleContext.jsx'

// Shown to roles without Booking app access.
export default function NoAccess() {
  const { label, setRole } = useRole()
  return (
    <main className="atlas-no-access atlas-view-enter">
      <section className="atlas-no-access-card atlas-raised">
        <div className="atlas-eyebrow">ATLAS BOOKING</div>
        <h1 className="atlas-no-access-title">This app is for Admins and Schedulers</h1>
        <p className="atlas-no-access-text">You’re signed in as {label}. Ask an Admin for access, or switch role to preview.</p>
        <div className="atlas-no-access-actions">
          {ROLES.filter((r) => r.id !== 'moderator').map((r) => (
            <button key={r.id} type="button" className="atlas-btn-primary atlas-btn-primary--compact" onClick={() => setRole(r.id)}>
              Continue as {r.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
