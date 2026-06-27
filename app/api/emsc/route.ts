import { NextResponse } from 'next/server'
import { fetchEmscEvents } from '@/lib/emsc'

export const revalidate = 60

export async function GET() {
  try {
    const events = await fetchEmscEvents({
      minMag: 2.0,
      bbox: [-74, 0, -59, 13], // Venezuela bbox [west, south, east, north]
      limit: 200,
    })

    return NextResponse.json({
      events,
      count: events.length,
      lastUpdated: Date.now(),
    })
  } catch {
    return NextResponse.json({ events: [], count: 0, lastUpdated: Date.now() })
  }
}
