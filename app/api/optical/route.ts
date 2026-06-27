import { type NextRequest, NextResponse } from 'next/server'
import { VEN_2406 } from '@/lib/events/ven-2406'
import { searchProducts, type CopernicusProduct } from '@/lib/copernicus'
import type { EventConfig } from '@/lib/events/ven-2406'

export const revalidate = 3600

const EVENTS: Record<string, EventConfig> = {
  'VEN-2406': VEN_2406,
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const eventId = req.nextUrl.searchParams.get('eventId') ?? 'VEN-2406'
  const rawPhase = req.nextUrl.searchParams.get('phase')
  const phase: 'pre' | 'post' = rawPhase === 'pre' ? 'pre' : 'post'
  const event = EVENTS[eventId] ?? VEN_2406

  const bbox: [number, number, number, number] = [
    event.bbox.minLng,
    event.bbox.minLat,
    event.bbox.maxLng,
    event.bbox.maxLat,
  ]

  const mainShock = new Date(event.mainShockTime).toISOString()
  const thirtyDaysBefore = new Date(event.mainShockTime - 30 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const [startDate, endDate] =
    phase === 'pre' ? [thirtyDaysBefore, mainShock] : [mainShock, now]

  let products: CopernicusProduct[] = []

  try {
    products = await searchProducts({
      collection: 'SENTINEL-2',
      bbox,
      startDate,
      endDate,
      productType: 'S2MSI2A',
      limit: 5,
    })
  } catch {
    // Degrade gracefully
  }

  return NextResponse.json({ products, phase, lastUpdated: Date.now() })
}
