import { useEffect, useState } from 'react'

// Every session time in Atlas is Pacific Time. This live clock sits over the
// Schedule Overview so a scheduler in ET (or anywhere) reads times the same
// way; hovering or focusing it shows their own local time beside PT.
const PT = 'America/Los_Angeles'

const timeIn = (date, timeZone) =>
  date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
const zoneName = (date, timeZone) =>
  new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? ''

function useMinuteClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer = 0
    const tick = () => {
      setNow(new Date())
      timer = setTimeout(tick, 60000 - (Date.now() % 60000))
    }
    timer = setTimeout(tick, 60000 - (Date.now() % 60000))
    return () => clearTimeout(timer)
  }, [])
  return now
}

export default function PtClock() {
  const now = useMinuteClock()
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const samePt = timeIn(now, localZone) === timeIn(now, PT) && zoneName(now, localZone) === zoneName(now, PT)
  const ptLabel = `${timeIn(now, PT)} ${zoneName(now, PT)}`
  const localLabel = `${timeIn(now, localZone)} ${zoneName(now, localZone)}`

  return (
    <div className="atlas-pt-clock" tabIndex={0} aria-describedby="atlas-pt-clock-tip">
      <span className="atlas-pt-clock-dot" aria-hidden="true" />
      <span className="atlas-eyebrow atlas-pt-clock-label">PT LOCAL</span>
      <time className="atlas-pt-clock-time" dateTime={now.toISOString()}>{ptLabel}</time>
      <div id="atlas-pt-clock-tip" role="tooltip" className="atlas-pt-clock-tip atlas-raised-sm">
        <div className="atlas-pt-clock-tip-title">All session times are Pacific Time</div>
        <div className="atlas-pt-clock-tip-row">
          <span>Your time</span>
          <span className="atlas-pt-clock-tip-value">{samePt ? `${localLabel} (same as PT)` : localLabel}</span>
        </div>
      </div>
    </div>
  )
}
