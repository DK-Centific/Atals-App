import { STATUS } from '../../data/schedule.js'
import { HOME_TYPES, homeKey, normHomeText } from '../../lib/home.js'
import CountUp from '../../motion/CountUp.jsx'
import { StatusDot } from '../StatusLegend.jsx'

// Production tracker > Home types. One card per OneForma home type (screening Q6),
// with a house that fills from the ground up: completed, then booked, the rest open.
// The two Single-family types always show, in this order, even at 0; any other
// answer goes to "Other", shown only when someone has it. Under each house, the
// size (Q15) and features (Q16) of the people in that card.

const norm = normHomeText

// The two acceptable answers, as cards in this order (full OneForma wording as the label).
const TYPES = HOME_TYPES.map((t) => ({ key: t.id, label: t.full, stories: t.stories }))
const SIZES = ['less than 150 sq. m.', '150-200 sq. m.', 'more than 200 sq. m.']
const FEATURES = ['L-shape', 'Open Plan', 'Curved Walls', 'Mirrors', 'Glass', 'Stairs']

const typeKey = (type) => homeKey(type) ?? 'other'

/**
 * people: everyone counted (in scope), each with `home` and `state`
 * ('completed' | 'booked' | 'open' for the tracker's range).
 */
export default function HomeTypes({ people, scopeNote }) {
  const groups = Object.fromEntries([...TYPES.map((t) => [t.key, []]), ['other', []]])
  for (const p of people) {
    if (!p.home?.type) continue
    groups[typeKey(p.home.type)].push(p)
  }
  const cards = [
    ...TYPES.map((t) => ({ ...t, people: groups[t.key] })),
    ...(groups.other.length ? [{ key: 'other', label: 'Other', stories: 0, people: groups.other }] : []),
  ]
  const unanswered = people.filter((p) => !p.home?.type).length

  return (
    <section className="atlas-tracker-card atlas-raised-sm" aria-label="Home types">
      <div className="atlas-tracker-card-head">
        <span className="atlas-tracker-card-title">Home types</span>
        <div className="atlas-tracker-legend" aria-hidden="true">
          <span className="atlas-tracker-legend-item"><StatusDot status="completed" />{STATUS.completed.label}</span>
          <span className="atlas-tracker-legend-item"><StatusDot status="booked" />{STATUS.booked.label}</span>
          <span className="atlas-tracker-legend-item"><span className="atlas-home-open-dot" />Not booked</span>
        </div>
      </div>
      <div className="atlas-home-grid">
        {cards.map((c) => <HomeCard key={c.key} card={c} />)}
      </div>
      <p className="atlas-tracker-card-note">
        {scopeNote}{unanswered ? ` ${unanswered} without a home-type answer aren’t shown.` : ''}
      </p>
    </section>
  )
}

function HomeCard({ card }) {
  const total = card.people.length
  const completed = card.people.filter((p) => p.state === 'completed').length
  const booked = card.people.filter((p) => p.state === 'booked').length
  const covered = total ? Math.round(((completed + booked) / total) * 100) : 0
  const sizes = countOptions(card.people.map((p) => p.home.size), SIZES)
  const features = countOptions(card.people.flatMap((p) => p.home.features ?? []), FEATURES)
  const summary = `${card.label}: ${completed} completed, ${booked} booked, of ${total}`

  return (
    <article className="atlas-home-card atlas-well">
      <header className="atlas-home-top">
        <House stories={card.stories} completed={total ? completed / total : 0} booked={total ? booked / total : 0} label={summary} />
        <div className="atlas-home-summary">
          <h3 className="atlas-home-name">{card.label}</h3>
          <p className="atlas-home-covered"><strong>{covered}%</strong> covered</p>
          <dl className="atlas-home-stats">
            <Stat n={completed} label="Completed" status="completed" />
            <Stat n={booked} label="Booked" status="booked" />
            <Stat n={total} label="Total" />
          </dl>
        </div>
      </header>
      <Breakdown title="Size" rows={sizes} max={total} />
      <Breakdown title="Features" rows={features} max={total} columns />
    </article>
  )
}

function Stat({ n, label, status }) {
  return (
    <div className="atlas-home-stat">
      <dd className="atlas-home-stat-value"><CountUp value={n} /></dd>
      <dt className="atlas-home-stat-label">
        {status ? <StatusDot status={status} /> : <span className="atlas-home-open-dot" />}
        {label}
      </dt>
    </div>
  )
}

/** [{ label, n }] for each known option (in order, even at 0), then any other value seen. */
function countOptions(values, options) {
  const rows = options.map((label) => ({ label, n: 0 }))
  const other = new Map()
  for (const v of values) {
    if (!v) continue
    const row = rows.find((r) => norm(r.label) === norm(v))
    if (row) row.n += 1
    else other.set(v.trim(), (other.get(v.trim()) ?? 0) + 1)
  }
  return [...rows, ...[...other].map(([label, n]) => ({ label, n }))]
}

// One option per row: label, count, and a thin bar for its share of the card's people.
function Breakdown({ title, rows, max, columns = false }) {
  return (
    <section className="atlas-home-breakdown" aria-label={title}>
      <span className="atlas-eyebrow">{title}</span>
      <ul className={`atlas-home-rows${columns ? ' atlas-home-rows--2' : ''}`}>
        {rows.map((r) => (
          <li key={r.label} className={`atlas-home-row${r.n ? '' : ' is-zero'}`}>
            <span className="atlas-home-row-label">{r.label}</span>
            <strong className="atlas-home-row-count">{r.n}</strong>
            <span className="atlas-home-row-track" aria-hidden="true">
              <span className="atlas-home-row-bar atlas-reveal-x" style={{ width: `${max ? Math.min(100, (r.n / max) * 100) : 0}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// House outlines on a 120 x 110 grid; the fill rises from the ground line (y = 102).
const SHAPES = {
  2: { body: 'M60 6 L110 42 H99 V102 H21 V42 H10 Z', top: 6, windows: [[33, 50], [75, 50], [33, 74], [75, 74]], floor: 68 },
  1: { body: 'M60 28 L112 64 H100 V102 H20 V64 H8 Z', top: 28, windows: [[32, 72], [76, 72]], floor: null },
  0: { body: 'M60 18 L110 54 H99 V102 H21 V54 H10 Z', top: 18, windows: [[33, 64], [75, 64]], floor: null },
}
const GROUND = 102

function House({ stories, completed, booked, label }) {
  const s = SHAPES[stories] ?? SHAPES[0]
  const h = GROUND - s.top
  const hc = h * completed
  const hb = h * booked
  const id = `atlas-home-clip-${stories}`
  return (
    <svg className="atlas-home-house" viewBox="0 0 120 110" role="img" aria-label={label}>
      <defs><clipPath id={id}><path d={s.body} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect className="atlas-home-open" x="0" y="0" width="120" height="110" />
        {hb > 0 && <rect className="atlas-home-fill atlas-home-fill--booked" x="0" y={GROUND - hc - hb} width="120" height={hb} />}
        {hc > 0 && <rect className="atlas-home-fill atlas-home-fill--completed" x="0" y={GROUND - hc} width="120" height={hc} />}
      </g>
      {s.floor && <line className="atlas-home-line" x1="21" x2="99" y1={s.floor} y2={s.floor} />}
      {s.windows.map(([x, y]) => <rect key={`${x}-${y}`} className="atlas-home-line" x={x} y={y} width="12" height="10" rx="1.5" />)}
      <rect className="atlas-home-line" x="53" y={GROUND - 20} width="14" height="20" rx="1.5" />
      <path className="atlas-home-outline" d={s.body} />
    </svg>
  )
}
