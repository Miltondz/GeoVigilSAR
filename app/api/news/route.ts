import { NextRequest, NextResponse } from 'next/server'
import { fetchGDELTNews } from '@/lib/gdelt'
import { getEvent } from '@/lib/events/index'

export const runtime = 'nodejs'
export const revalidate = 900

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const eventId = searchParams.get('eventId') ?? 'VEN-2406'
  const lang    = searchParams.get('lang') as 'es' | 'en' | null
  const limit   = parseInt(searchParams.get('limit') ?? '25', 10)
  const place   = searchParams.get('place') ?? ''  // optional location term

  const event   = getEvent(eventId)
  const eqTime  = parseInt(searchParams.get('eqTime') ?? '0', 10)

  // Use the earlier of: the specific earthquake's time or the event's mainShockTime
  const anchorMs = eqTime > 0 ? Math.min(eqTime, event.mainShockTime) : event.mainShockTime
  const startDateTime = new Date(anchorMs)
    .toISOString().replace(/[-:T]/g, '').slice(0, 14)

  const baseQuery = event.gdeltQuery
  // No quotes around place — allows partial/variant matches (small towns often absent otherwise)
  const query = place ? `${baseQuery} ${place}` : baseQuery

  try {
    let items = await fetchGDELTNews(query, { maxRecords: limit, startDateTime })

    // Fallback: place produced nothing → retry with broader base query only
    if (items.length === 0 && place) {
      items = await fetchGDELTNews(baseQuery, { maxRecords: limit, startDateTime })
    }

    const filtered = lang ? items.filter(i => i.language === lang) : items
    const lastUpdated = Date.now()

    return NextResponse.json(
      { items: filtered, lastUpdated, count: filtered.length },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1200' } }
    )
  } catch (err) {
    console.error('GDELT fetch error:', err)
    return NextResponse.json({ error: 'GDELT fetch failed' }, { status: 502 })
  }
}
