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

  const event = getEvent(eventId)
  const query = place ? `${event.gdeltQuery} "${place}"` : event.gdeltQuery

  try {
    const items = await fetchGDELTNews(query, {
      maxRecords: limit,
      timespanMinutes: 1440,
    })

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
