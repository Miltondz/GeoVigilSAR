// GET /api/air-traffic
// Returns aircraft positions over Venezuela bbox from OpenSky Network.
// Never returns 500 — external failures degrade to empty array.

import { NextResponse } from 'next/server'
import { getAirTrafficProvider } from '@/lib/airtraffic/provider'

// OpenSky anon: 400 credits/day → floor every 216s. With auth: 4000/day → 22s floor.
// 60s gives safe margin for both tiers; client polls match.
export const revalidate = 60

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
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=90',
      },
    },
  )
}
