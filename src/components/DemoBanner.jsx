import { DEMO, setDemo } from '../lib/oneforma/config.ts'

// Always on screen in demo mode, so nobody mistakes sample people for real ones.
export default function DemoBanner() {
  if (!DEMO) return null
  return (
    <div className="atlas-demo-banner" role="status">
      <span className="atlas-demo-banner-dot" aria-hidden="true" />
      <span><strong>Demo data</strong> · sample people, nothing is saved, sent or emailed</span>
      <button type="button" className="atlas-link atlas-demo-banner-off" onClick={() => setDemo(false)}>Show real data</button>
    </div>
  )
}
