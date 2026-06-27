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

  let post: CopernicusProduct[] = []
  let pre: CopernicusProduct[] = []

  try {
    ;[post, pre] = await Promise.all([
      searchProducts({
        collection: 'SENTINEL-1',
        bbox,
        startDate: mainShock,
        endDate: now,
        productType: 'GRD',
        limit: 5,
      }),
      searchProducts({
        collection: 'SENTINEL-1',
        bbox,
        startDate: thirtyDaysBefore,
        endDate: mainShock,
        productType: 'GRD',
        limit: 5,
      }),
    ])
  } catch {
    // Degrade gracefully — return empty arrays
  }

  return NextResponse.json({ post, pre, lastUpdated: Date.now() })
}
