import type { NewsItem } from '@/lib/gdelt'
import type { ReliefReport } from '@/lib/reliefweb'

export interface ZoneInfo {
  country:      string
  countryIso2:  string
  lat:          number
  lng:          number
}

export interface ZoneSnapshot {
  bboxHash:  string
  zone:      ZoneInfo
  news:      NewsItem[]
  reports:   ReliefReport[]
  fetchedAt: number
}

const STORAGE_KEY = 'geovigil:zone-cache:v1'
const TTL_MS      = 20 * 60 * 1000   // 20 min

type CacheStore = Record<string, ZoneSnapshot>

function bboxHash(minLat: number, maxLat: number, minLng: number, maxLng: number): string {
  // Round to 1 decimal to group nearby viewports
  return [minLat, maxLat, minLng, maxLng].map(v => v.toFixed(1)).join(',')
}

function readStore(): CacheStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CacheStore) : {}
  } catch {
    return {}
  }
}

function writeStore(store: CacheStore): void {
  if (typeof window === 'undefined') return
  // Prune expired entries before writing
  const now = Date.now()
  const pruned = Object.fromEntries(
    Object.entries(store).filter(([, v]) => now - v.fetchedAt < TTL_MS * 3)
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
}

export function getCachedZone(
  minLat: number, maxLat: number, minLng: number, maxLng: number
): ZoneSnapshot | null {
  const key   = bboxHash(minLat, maxLat, minLng, maxLng)
  const store = readStore()
  const entry = store[key]
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > TTL_MS) return null  // expired
  return entry
}

export function setCachedZone(
  minLat: number, maxLat: number, minLng: number, maxLng: number,
  snapshot: Omit<ZoneSnapshot, 'bboxHash'>
): ZoneSnapshot {
  const key   = bboxHash(minLat, maxLat, minLng, maxLng)
  const entry = { ...snapshot, bboxHash: key }
  const store = readStore()
  store[key]  = entry
  writeStore(store)
  return entry
}

export function mkBboxHash(
  minLat: number, maxLat: number, minLng: number, maxLng: number
): string {
  return bboxHash(minLat, maxLat, minLng, maxLng)
}
