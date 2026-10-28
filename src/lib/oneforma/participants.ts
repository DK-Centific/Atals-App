// The OneForma participant queue. With VITE_ATLAS_READ_URL set it reads the Power
// Automate read flow (Atlas_Participants); without it, it runs the sample Event Hub
// messages through the same rules the flow uses, so the dry run behaves like the real feed.

import { SAMPLE_COORDS, SAMPLE_FEED } from '../../data/oneFormaFeedSample.ts'
import { OF_PROJECT_ID, READ_URL } from './config.ts'
import { emptyStats, fromRows, ingest } from './feed.ts'
import { fetchRead } from './readFlow.ts'
import type { OneformaSync } from './readFlow.ts'
import type { FeedStats, Participant } from './types.ts'

export const usingSample = !READ_URL
const SAMPLE_DELAY_MS = 650

export interface ParticipantSnapshot {
  participants: Participant[]
  stats: FeedStats
  fetchedAt: string
  /** The relay's health from the read flow; null when it doesn't report it. */
  oneformaSync?: OneformaSync | null
}

const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const t = setTimeout(resolve, ms)
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')) })
})

export async function fetchParticipants(signal?: AbortSignal): Promise<ParticipantSnapshot> {
  if (!READ_URL) {
    await wait(SAMPLE_DELAY_MS, signal)
    const { participants, stats } = ingest(SAMPLE_FEED, OF_PROJECT_ID, SAMPLE_COORDS)
    return { participants, stats, fetchedAt: new Date().toISOString() }
  }
  const body = await fetchRead()
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const participants = fromRows(body.participants ?? [], OF_PROJECT_ID)
  return {
    participants,
    stats: { ...emptyStats(), items: participants.length, removed: participants.filter((p) => !p.active).length },
    fetchedAt: body.syncedAt ?? new Date().toISOString(),
    oneformaSync: body.oneformaSync ?? null,
  }
}

// Cache, then refresh (spec section 7): the last copy shows at once.
// v2: participants keyed by OneForma userId (v1 held the old mock ids).
const CACHE_KEY = 'atlas_of_cache_v2'

export function readCache(): ParticipantSnapshot | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? 'null') as ParticipantSnapshot | null
    return saved?.participants && saved.stats ? saved : null
  } catch {
    return null
  }
}

export function writeCache(data: ParticipantSnapshot): void {
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* storage off: no cache */ }
}
