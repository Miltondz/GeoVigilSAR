import { NextRequest, NextResponse } from 'next/server'
import { fetchUSGSEarthquakes, classifyEarthquake } from '@/lib/usgs'
import { getEvent } from '@/lib/events/index'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const eventId = searchParams.get('eventId') ?? 'VEN-2406'
  const minMag   = parseFloat(searchParams.get('minMag') ?? '2.0')
  const limit     = parseInt(searchParams.get('limit') ?? '500', 10)

  const event = getEvent(eventId)

  try {
    const raw = await fetchUSGSEarthquakes(event.bbox, {
      startTime: event.usgsQuery.startTime,
      minMagnitude: minMag,
      limit,
    })

    const earthquakes = raw.map(f => ({
      ...f,
      eventId,
      classification: classifyEarthquake(f, event.mainShockTime, event.mainShockMagnitude),
    }))

    const lastUpdated = Date.now()

    return NextResponse.json(
      { earthquakes, lastUpdated, count: earthquakes.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=90',
          ETag: `"${lastUpdated}"`,
        },
      }
    )
  } catch (err) {
    console.error('USGS fetch error:', err)
    return NextResponse.json({ error: 'USGS fetch failed' }, { status: 502 })
  }
}
