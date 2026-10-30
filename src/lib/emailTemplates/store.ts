import { useCallback, useEffect, useState } from 'react'
import { storageKey } from '../oneforma/config.ts'
import { DEFAULT_CONTENT } from './defaults.ts'
import { sanitize } from './render.ts'
import type { TemplateContent, TemplateId } from './types.ts'

// Where the templates live: this browser's storage for now, seeded with the
// defaults. Edits made in one browser reach other people once the templates are
// kept in a SharePoint list (follow-up); until then, an Admin's edits show on
// the device they were made on.

const KEY = storageKey('atlas_email_templates_v1')

type Saved = Partial<Record<TemplateId, TemplateContent>>

function load(): Saved {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as { version?: number; templates?: Saved } | null
    if (raw?.version === 1 && raw.templates && typeof raw.templates === 'object') return raw.templates
  } catch {
    // Unreadable or blocked storage: the defaults stand in.
  }
  return {}
}

const contentOf = (saved: Saved, id: TemplateId): TemplateContent => {
  const s = saved[id]
  return s && typeof s.html === 'string' && typeof s.subject === 'string'
    ? { ...s, html: sanitize(s.html) }
    : DEFAULT_CONTENT[id]
}

export interface TemplateStore {
  get: (id: TemplateId) => TemplateContent
  isEdited: (id: TemplateId) => boolean
  /** Throws when the browser refuses to store it (usually: images too large). */
  save: (id: TemplateId, next: { subject: string; html: string }, by: string) => void
  reset: (id: TemplateId) => void
}

export function useTemplateStore(): TemplateStore {
  const [saved, setSaved] = useState<Saved>(load)

  // Another tab saved: pick it up.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setSaved(load()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const write = useCallback((next: Saved) => {
    window.localStorage.setItem(KEY, JSON.stringify({ version: 1, templates: next }))
    setSaved(next)
  }, [])

  const get = useCallback((id: TemplateId) => contentOf(saved, id), [saved])
  const isEdited = useCallback((id: TemplateId) => Boolean(saved[id]), [saved])

  const save = useCallback((id: TemplateId, next: { subject: string; html: string }, by: string) => {
    write({ ...saved, [id]: { subject: next.subject.trim(), html: sanitize(next.html), updatedAt: new Date().toISOString(), updatedBy: by } })
  }, [saved, write])

  const reset = useCallback((id: TemplateId) => {
    const { [id]: _dropped, ...rest } = saved
    write(rest)
  }, [saved, write])

  return { get, isEdited, save, reset }
}
