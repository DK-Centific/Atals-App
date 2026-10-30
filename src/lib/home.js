// OneForma's home-type answer (screening Q6) as a short key, so filters, labels and
// the tracker agree however the text is spaced or capitalised. Two answers are
// acceptable for this project; anything else is 'other'.

const norm = (s) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

export const HOME_TYPES = [
  { id: 'multi', label: 'Multi-story', full: 'Single-family Multi-story', stories: 2 },
  { id: 'single', label: 'Single-story', full: 'Single-family Single-story', stories: 1 },
]

/** 'multi' | 'single' | 'other', or null with no answer. */
export const homeKey = (type) => (norm(type) ? HOME_TYPES.find((t) => norm(t.full) === norm(type))?.id ?? 'other' : null)

/** Short label for a home type: "Multi-story", "Single-story", or OneForma's own text. */
export const homeLabel = (type) => HOME_TYPES.find((t) => t.id === homeKey(type))?.label ?? type ?? ''

export const homeStories = (type) => HOME_TYPES.find((t) => t.id === homeKey(type))?.stories ?? 1

export { norm as normHomeText }
