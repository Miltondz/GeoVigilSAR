// GET /api/air-traffic
// Returns aircraft positions over Venezuela bbox from OpenSky Network.
// Never returns 500 — external failures degrade to empty array.

import { NextResponse } from 'next/server'
import { getAirTrafficProvider } from '@/lib/airtraffic/provider'

export const revalidate = 30 // Next.js ISR — regenerate every 30 seconds

export async function GET(): Promise<NextResponse> {
  const provider = getAirTrafficProvider()
  const aircraft  = await provider.fetchTraffic()
  const lastUpdated = Date.now()

  return NextResponse.json(
    {
      aircraft,
      count: aircraft.length,
      cached: aircraft.length === 0,
      lastUpdated,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    },
  )
}
