/**
 * lib/celestrak.ts
 * Fetches Two-Line Element sets from Celestrak (no API key required).
 * Falls back to hardcoded TLEs when the network is unavailable.
 */
import type { TLE } from './orbits'

// ── Fallback TLEs ─────────────────────────────────────────────────────────────
// Approximate orbital elements for Sentinel-1A; epoch 2026-06-24 12:00 UTC
// (day 175.5 of year 2026). Used when Celestrak is unreachable.
// Mean motion 14.59198520 rev/day is accurate for S-1A at ~693 km.

const SENTINEL1A_FALLBACK: TLE = {
  name: 'SENTINEL-1A',
  line1: '1 39634U 14016A   26175.50000000  .00000025  00000-0  15001-4 0  9991',
  line2: '2 39634  98.1811 195.0000 0001224  90.0000 270.0000 14.59198520000004',
  noradId: 39634,
}

// Sentinel-1B entered safe-hold 2021; may return 0 results from Celestrak.
const SENTINEL1B_FALLBACK: TLE = {
  name: 'SENTINEL-1B',
  line1: '1 41456U 16025A   26175.50000000  .00000025  00000-0  15001-4 0  9997',
  line2: '2 41456  98.1813  15.0000 0001224  90.0000  90.0000 14.59198520000004',
  noradId: 41456,
}

const FALLBACK_MAP: Record<number, TLE> = {
  39634: SENTINEL1A_FALLBACK,
  41456: SENTINEL1B_FALLBACK,
}

function getFallback(noradId: number): TLE {
  return (
    FALLBACK_MAP[noradId] ?? {
      ...SENTINEL1A_FALLBACK,
      noradId,
      name: `SAT-${noradId}`,
    }
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch TLE for the given NORAD catalog number from Celestrak.
 * Response is cached 12 h by Next.js fetch cache (revalidate: 43200).
 * Silently falls back to a hardcoded TLE on any error.
 */
export async function fetchTLE(noradId: number): Promise<TLE> {
  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=TLE`

  try {
    const res = await fetch(url, {
      next: { revalidate: 43200 }, // 12 h
      signal: AbortSignal.timeout(10_000), // 10 s hard limit
    })

    if (!res.ok) return getFallback(noradId)

    const text = await res.text()
    const lines = text
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    // Celestrak TLE format: NAME\n1 …\n2 …
    if (lines.length < 3) return getFallback(noradId)
    // Sanity-check: line 1 starts with '1' and line 2 starts with '2'
    if (!lines[1].startsWith('1 ') || !lines[2].startsWith('2 '))
      return getFallback(noradId)

    return {
      name: lines[0],
      line1: lines[1],
      line2: lines[2],
      noradId,
    }
  } catch {
    // Network error, timeout, or parse failure → degrade gracefully
    return getFallback(noradId)
  }
}
