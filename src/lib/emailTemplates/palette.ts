import type { EmailMode } from './types.ts'

// Email colours: the Atlas theme carried into an inbox. Templates are written in
// the light palette (what almost every inbox shows); the dark preview swaps each
// light colour for its partner below. Colours picked by hand outside the
// palette stay as they are in both modes.

export const LIGHT = {
  page: '#F3F4F6',
  card: '#FFFFFF',
  frame: '#F8F9FA',
  frameLine: '#E6E8EB',
  ink: '#1A1C1E',
  body: '#3D4148',
  muted: '#6B7079',
  accent: '#007C8C',
  accentBar: '#00B8CC',
  detail: '#EEF9FB',
  detailLine: '#CFEFF4',
  danger: '#C53030',
  dangerTint: '#FDF0F0',
  amber: '#B45309',
  green: '#047857',
  logo: '#3A3D42',
  field: '#FFF4CC',
  buttonText: '#FFFFFF',
} as const

export type PaletteKey = keyof typeof LIGHT

export const DARK: Record<PaletteKey, string> = {
  page: '#151719',
  card: '#1A1C1E',
  frame: '#222428',
  frameLine: '#2C2F33',
  ink: '#F0F0F2',
  body: '#C4C7CD',
  muted: '#858992',
  accent: '#00E5FF',
  accentBar: '#00E5FF',
  detail: '#1B2A2E',
  detailLine: '#23434A',
  danger: '#F87171',
  dangerTint: '#2A1D1F',
  amber: '#FBBF24',
  green: '#34D399',
  logo: '#FFFFFF',
  field: '#4A3F14',
  buttonText: '#0B0C0D',
}

export const paletteFor = (mode: EmailMode): Record<PaletteKey, string> => (mode === 'dark' ? DARK : LIGHT)

const SWAP = new Map<string, string>(
  (Object.keys(LIGHT) as PaletteKey[]).map((k) => [LIGHT[k].toLowerCase(), DARK[k]]),
)
// execCommand writes colours as rgb(); match those too.
const rgbOf = (hex: string): string => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}
const SWAP_RGB = new Map<string, string>(
  (Object.keys(LIGHT) as PaletteKey[]).map((k) => [rgbOf(LIGHT[k]), DARK[k]]),
)

/** The dark-mode version of light-palette HTML. */
export function toDark(html: string): string {
  return html
    .replace(/#[0-9a-f]{6}\b/gi, (hex) => SWAP.get(hex.toLowerCase()) ?? hex)
    .replace(/rgb\(\s*\d+,\s*\d+,\s*\d+\s*\)/g, (rgb) => SWAP_RGB.get(rgb.replace(/\s+/g, '').replace(/,/g, ', ')) ?? rgb)
}

/** Text colours offered in the editor, in the order shown. */
export const TEXT_SWATCHES: { key: PaletteKey; label: string }[] = [
  { key: 'ink', label: 'Ink' },
  { key: 'body', label: 'Body' },
  { key: 'muted', label: 'Muted' },
  { key: 'accent', label: 'Atlas teal' },
  { key: 'danger', label: 'Red' },
  { key: 'amber', label: 'Amber' },
  { key: 'green', label: 'Green' },
]

/** Highlight colours (text background). */
export const HIGHLIGHT_SWATCHES: { key: PaletteKey; label: string }[] = [
  { key: 'detail', label: 'Teal tint' },
  { key: 'field', label: 'Yellow' },
  { key: 'dangerTint', label: 'Red tint' },
]
