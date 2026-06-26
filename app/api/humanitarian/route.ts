import { NextResponse } from 'next/server'
import { fetchReliefWebReports } from '@/lib/reliefweb'
import { fetchGDELTVictimCounts } from '@/lib/gdelt'
import { VEN_2406 } from '@/lib/events/ven-2406'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET() {
  try {
    const [reports, counts] = await Promise.all([
      fetchReliefWebReports(VEN_2406.reliefWebCountry, 10),
      fetchGDELTVictimCounts(VEN_2406.gdeltQuery),
    ])

    const stats = {
      fatalities: counts.fatalities,
      injured: counts.injured,
      displaced: counts.displaced,
      missing: undefined as number | undefined,
      rescuedAlive: undefined as number | undefined,
      source: counts.source,
      timestamp: counts.timestamp,
    }

    const lastUpdated = Date.now()

    return NextResponse.json(
      { stats, reports, lastUpdated },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=4500' } }
    )
  } catch (err) {
    console.error('Humanitarian fetch error:', err)
    return NextResponse.json({ error: 'Humanitarian data fetch failed' }, { status: 502 })
  }
}
