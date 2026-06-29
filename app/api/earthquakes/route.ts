import { NextRequest, NextResponse } from 'next/server'
import { fetchUSGSEarthquakes, classifyEarthquake } from '@/lib/usgs'
import { getEvent } from '@/lib/events/index'

export const runtime = 'nodejs'
// No static revalidate — bbox is dynamic per viewport

const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const eventId    = searchParams.get('eventId') ?? 'VEN-2406'
  const minMag     = parseFloat(searchParams.get('minMag') ?? '2.0')
  const limit      = parseInt(searchParams.get('limit') ?? '500', 10)
  const startParam = searchParams.get('startTime')
  const endParam   = searchParams.get('endTime')

  // Dynamic viewport bbox (set when user pans away from event area)
  const minLatParam = searchParams.get('minLat')
  const maxLatParam = searchParams.get('maxLat')
  const minLngParam = searchParams.get('minLng')
  const maxLngParam = searchParams.get('maxLng')

  const event = getEvent(eventId)

  const hasDynamicBbox = minLatParam && maxLatParam && minLngParam && maxLngParam
  const bbox = hasDynamicBbox ? {
    minLat: parseFloat(minLatParam),
    maxLat: parseFloat(maxLatParam),
    minLng: parseFloat(minLngParam),
    maxLng: parseFloat(maxLngParam),
  } : event.bbox

  // When viewport is away from the event bbox and no manual date, use 30-day rolling window
  const isNearEvent = hasDynamicBbox ? (
    bbox.minLat <= event.epicenter.lat && event.epicenter.lat <= bbox.maxLat &&
    bbox.minLng <= event.epicenter.lng && event.epicenter.lng <= bbox.maxLng
  ) : true

  const defaultStartTime = isNearEvent
    ? event.usgsQuery.startTime
    : new Date(Date.now() - THIRTY_DAYS_MS).toISOString().slice(0, 19)

  const defaultEndTime = isNearEvent ? event.usgsQuery.endTime : undefined

  const startTime = startParam ? `${startParam}T00:00:00` : defaultStartTime
  const endTime   = endParam   ? `${endParam}T23:59:59`   : defaultEndTime ? `${defaultEndTime}T23:59:59` : undefined

  try {
    const raw = await fetchUSGSEarthquakes(bbox, {
      startTime,
      endTime,
      minMagnitude: minMag,
      limit,
    })

    const earthquakes = raw.map(f => ({
      ...f,
      eventId,
      classification: isNearEvent
        ? classifyEarthquake(f, event.mainShockTime, event.mainShockMagnitude)
        : 'earthquake',
    }))

    const lastUpdated = Date.now()

    return NextResponse.json(
      { earthquakes, lastUpdated, count: earthquakes.length, isNearEvent, bbox },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=90',
        },
      }
    )
  } catch (err) {
    console.error('USGS fetch error:', err)
    return NextResponse.json({ error: 'USGS fetch failed' }, { status: 502 })
  }
}
