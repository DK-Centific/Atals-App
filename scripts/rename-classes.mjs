// Renames the design's generic CSS class names to Atlas names.
// Usage: node rename-classes.mjs <project-root>   (edits src/**/*.{css,js,jsx} in place)
import fs from 'node:fs'
import path from 'node:path'

const MAP = {
  // surfaces
  'neu-flat': 'atlas-raised', 'neu-flat-sm': 'atlas-raised-sm',
  'neu-inset': 'atlas-well', 'neu-inset-sm': 'atlas-well-sm',
  'neu-btn': 'atlas-icon-btn', 'neu-input': 'atlas-input',
  'btn-primary': 'atlas-btn-primary', 'label-micro': 'atlas-eyebrow',
  'link-quiet': 'atlas-link', 'icon-spin': 'atlas-spin-once',
  'scrollbar-hidden': 'atlas-no-scrollbar', 'scrollbar-hide': 'atlas-no-scrollbar',
  // shell
  'nav-item': 'atlas-rail-item',
  'pill-toggle': 'atlas-view-tab', 'pill-dot': 'atlas-view-tab-dot',
  'view-day': 'atlas-day-view', 'view-week': 'atlas-week-view', 'view-month': 'atlas-month-view',
  'view-enter': 'atlas-page-enter', 'view-leave': 'atlas-page-leave',
  // status
  'status-dot': 'atlas-status-dot',
  'dot-insession': 'atlas-status-dot--insession', 'dot-booked': 'atlas-status-dot--booked',
  'dot-completed': 'atlas-status-dot--completed', 'dot-cancelled': 'atlas-status-dot--cancelled',
  // day view
  'session-card': 'atlas-session-card',
  'status-insession': 'atlas-session-card--insession', 'status-completed': 'atlas-session-card--completed',
  'status-cancelled': 'atlas-session-card--cancelled',
  'day-pill': 'atlas-date-chip',
  'team-slot': 'atlas-team-option', 'team-avatar': 'atlas-team-badge', 'team-check': 'atlas-team-check',
  'map-zoom-btn': 'atlas-map-zoom', 'route-map-svg': 'atlas-route-map',
  // week view
  'grid-container': 'atlas-week-grid', 'grid-header-cell': 'atlas-week-day-head',
  'time-cell': 'atlas-week-hour', 'grid-cell': 'atlas-week-slot',
  'calendar-event': 'atlas-week-event',
  'event-insession': 'atlas-week-event--insession', 'event-booked': 'atlas-week-event--booked',
  'event-completed': 'atlas-week-event--completed', 'event-cancelled': 'atlas-week-event--cancelled',
  // month view
  'calendar-grid': 'atlas-month-grid', 'day-cell': 'atlas-month-day', 'day-number': 'atlas-month-day-num',
  'mini-chip': 'atlas-month-chip',
  'chip-insession': 'atlas-month-chip--insession', 'chip-booked': 'atlas-month-chip--booked',
  'chip-completed': 'atlas-month-chip--completed', 'chip-cancelled': 'atlas-month-chip--cancelled',
  'summary-bar': 'atlas-today-strip', 'summary-item': 'atlas-today-item',
  // toast
  'toast-error': 'atlas-toast--error', 'toast-info': 'atlas-toast--info',
}

// Class names built from a variable: `dot-${status}` etc.
const DYNAMIC = [
  ['`dot-${', '`atlas-status-dot--${'], [' dot-${', ' atlas-status-dot--${'],
  ['event-${', 'atlas-week-event--${'], ['chip-${', 'atlas-month-chip--${'],
  ['slide-${', 'atlas-slide-${'], ['toast-${', 'atlas-toast--${'],
]

// Plain-word animation classes: renamed only where they are class names.
const WORDS = ['rise', 'pop', 'shake']

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const B = '(?<![A-Za-z0-9_-])', A = '(?![A-Za-z0-9_-])'

function rename(src, isCss) {
  for (const [from, to] of DYNAMIC) src = src.split(from).join(to)
  for (const [from, to] of Object.entries(MAP)) {
    src = src.replace(new RegExp(B + esc(from) + A, 'g'), to)
  }
  if (isCss) {
    src = src.replace(/\.(rise|pop|shake|slide-next|slide-prev)(?![A-Za-z0-9_-])/g, '.atlas-$1')
    src = src.replace(/@keyframes (rise|pop|shake)\b/g, '@keyframes atlas-$1')
    src = src.replace(/animation: (rise|pop|shake) /g, 'animation: atlas-$1 ')
    src = src.replace(/\.(toast-error)\b/g, '.atlas-toast--error')
  } else {
    for (const w of WORDS) {
      src = src.replace(new RegExp(`' ${w}'`, 'g'), `' atlas-${w}'`)
      src = src.replace(new RegExp(` ${w}\``, 'g'), ` atlas-${w}\``)
      src = src.replace(new RegExp(`(className="[^"]*?)(?<![A-Za-z0-9_-])${w}(?![A-Za-z0-9_-])`, 'g'), `$1atlas-${w}`)
    }
    src = src.replace('className="atlas-week-day-head border-right"', 'className="atlas-week-day-head"')
  }
  return src
}

const root = path.resolve(process.argv[2] || '.')
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])
let changed = 0
for (const f of walk(path.join(root, 'src')).filter((f) => /\.(css|jsx?|)$/.test(f))) {
  const before = fs.readFileSync(f, 'utf8')
  const after = rename(before, f.endsWith('.css'))
  if (after !== before) { fs.writeFileSync(f, after); changed++; console.log('updated', path.relative(root, f)) }
}
console.log(`${changed} files updated`)
