import { STATUS } from '../data/schedule.js'

export const StatusDot = ({ status, pulse = false }) => (
  <div className={`atlas-status-dot atlas-status-dot--${status}${pulse ? ' atlas-pulse' : ''}`} />
)

export default function StatusLegend({ statuses = Object.keys(STATUS), wide = false }) {
  return (
    <div className={`atlas-legend${wide ? ' atlas-legend--wide' : ''}`}>
      {statuses.map((s) => (
        <div key={s} className="atlas-legend-item">
          <StatusDot status={s} /> {STATUS[s].label}
        </div>
      ))}
    </div>
  )
}
