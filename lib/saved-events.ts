export interface SavedEvent {
  id:           string
  label:        string
  place:        string
  lat:          number
  lng:          number
  magnitude:    number
  depth:        number
  time:         number    // ms UTC
  eventId?:     string    // registered event key (VEN-2406, TUR-2302…)
  pinned:       boolean
  archived:     boolean
  savedAt:      number    // ms UTC — when user saved it
  zoneCountry?: string    // from zone snapshot at save time
  zoneBboxHash?:string    // key to look up cached zone data
}

const STORAGE_KEY = 'geovigil:saved-events:v1'

const VEN_SEED: SavedEvent = {
  id:        'VEN-2406-seed',
  label:     'Venezuela Mw 7.5 + 7.2',
  place:     'Veroes, Yaracuy — Falla Boconó-Morón-El Pilar',
  lat:       10.4,
  lng:       -68.7,
  magnitude: 7.5,
  depth:     15,
  time:      1750806240000,  // 2026-06-24T22:04:00Z
  eventId:   'VEN-2406',
  pinned:    true,
  archived:  false,
  savedAt:   1750806240000,
}

function read(): SavedEvent[] {
  if (typeof window === 'undefined') return [VEN_SEED]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [VEN_SEED]
    return JSON.parse(raw) as SavedEvent[]
  } catch {
    return [VEN_SEED]
  }
}

function write(events: SavedEvent[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

export function loadSavedEvents(): SavedEvent[] {
  const events = read()
  // Ensure VEN seed always exists
  if (!events.find(e => e.id === 'VEN-2406-seed')) {
    const next = [VEN_SEED, ...events]
    write(next)
    return next
  }
  return events
}

export function sortedEvents(events: SavedEvent[]): SavedEvent[] {
  return [...events].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1
    if (a.pinned   !== b.pinned)   return a.pinned   ? -1 : 1
    return b.savedAt - a.savedAt
  })
}

export function addSavedEvent(ev: Omit<SavedEvent, 'savedAt' | 'pinned' | 'archived'>): SavedEvent[] {
  const events = read()
  if (events.find(e => e.id === ev.id)) return events  // already saved
  const next = [{ ...ev, pinned: false, archived: false, savedAt: Date.now() }, ...events]
  write(next)
  return next
}

export function removeSavedEvent(id: string): SavedEvent[] {
  const next = read().filter(e => e.id !== id)
  write(next)
  return next
}

export function togglePin(id: string): SavedEvent[] {
  const next = read().map(e => e.id === id ? { ...e, pinned: !e.pinned } : e)
  write(next)
  return next
}

export function toggleArchive(id: string): SavedEvent[] {
  const next = read().map(e => e.id === id ? { ...e, archived: !e.archived, pinned: false } : e)
  write(next)
  return next
}

export function isEventSaved(id: string): boolean {
  return read().some(e => e.id === id)
}
