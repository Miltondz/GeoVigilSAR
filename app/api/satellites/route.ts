import { type NextRequest, NextResponse } from 'next/server'
import { fetchTLE } from '@/lib/celestrak'
import { buildSatellitePass } from '@/lib/orbits'
import { getEvent } from '@/lib/events/index'

export const revalidate = 43200 // 12 h

const SENTINEL_IDS = [39634] // Sentinel-1A; add 41456 (1B) if back in service

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId') ?? 'VEN-2406'
  const event = getEvent(eventId)
  const target = event.epicenter

  const passes = await Promise.all(
    SENTINEL_IDS.map(async (id) => {
      const tle = await fetchTLE(id)
      return buildSatellitePass(tle, target)
    }),
  )

  return NextResponse.json(
    { satellites: passes, count: passes.length, lastUpdated: Date.now() },
    { headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' } },
  )
}
