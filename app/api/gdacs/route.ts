import { NextResponse } from 'next/server'
import { fetchGdacsEarthquakes } from '@/lib/gdacs'
import type { GdacsEvent } from '@/lib/gdacs'

export const revalidate = 900

const VENEZUELA_BBOX = { minLat: 0, maxLat: 13, minLng: -74, maxLng: -59 }

function inVenezuelaBbox(event: GdacsEvent): boolean {
  return (
    event.lat >= VENEZUELA_BBOX.minLat &&
    event.lat <= VENEZUELA_BBOX.maxLat &&
    event.lng >= VENEZUELA_BBOX.minLng &&
    event.lng <= VENEZUELA_BBOX.maxLng
  )
}

const ALERT_RANK: Record<GdacsEvent['alertLevel'], number> = {
  Red: 3,
  Orange: 2,
  Green: 1,
  Unknown: 0,
}

export async function GET() {
  try {
    const all = await fetchGdacsEarthquakes()

    // Keep Red/Orange events within Venezuela bbox
    const filtered = all.filter(
      e => (e.alertLevel === 'Red' || e.alertLevel === 'Orange') && inVenezuelaBbox(e)
    )

    // If nothing matches, also include Green events near Venezuela
    const events = filtered.length > 0 ? filtered : all.filter(inVenezuelaBbox)

    const topAlert = events.reduce<GdacsEvent['alertLevel']>((best, e) => {
      return ALERT_RANK[e.alertLevel] > ALERT_RANK[best] ? e.alertLevel : best
    }, 'Unknown')

    const totalPop = events.reduce((sum, e) => sum + e.populationAffected, 0)

    return NextResponse.json({
      events,
      alertLevel: topAlert,
      populationAffected: totalPop,
      count: events.length,
      lastUpdated: Date.now(),
    })
  } catch {
    return NextResponse.json({
      events: [],
      alertLevel: 'Unknown' as const,
      populationAffected: 0,
      count: 0,
      lastUpdated: Date.now(),
    })
  }
}
