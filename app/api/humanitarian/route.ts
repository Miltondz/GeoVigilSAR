import { NextRequest, NextResponse } from 'next/server'
import { fetchReliefWebReports } from '@/lib/reliefweb'
import { fetchGDELTVictimCounts } from '@/lib/gdelt'
import { getEvent } from '@/lib/events/index'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const eventId = searchParams.get('eventId') ?? 'VEN-2406'

  const event = getEvent(eventId)

  try {
    const [reports, counts] = await Promise.all([
      fetchReliefWebReports(event.reliefWebCountry, 10),
      fetchGDELTVictimCounts(event.gdeltQuery),
    ])

    const stats = {
      fatalities:   counts.fatalities,
      injured:      counts.injured,
      displaced:    counts.displaced,
      missing:      undefined as number | undefined,
      rescuedAlive: undefined as number | undefined,
      source:       counts.source,
      timestamp:    counts.timestamp,
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
