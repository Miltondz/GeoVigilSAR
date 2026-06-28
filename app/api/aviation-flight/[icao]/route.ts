import { mapFlight } from '@/lib/aviationstack'

export const revalidate = 3600

export async function GET(
  _req: Request,
  { params }: { params: { icao: string } },
) {
  const { icao } = params
  const key = process.env.AVIATIONSTACK_KEY
  if (!key) {
    return Response.json({ flight: null }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } })
  }

  try {
    const res = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${key}&flight_icao=${encodeURIComponent(icao)}&limit=1`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) throw new Error(`aviationstack ${res.status}`)

    interface RawEnvelope { data?: Record<string, unknown>[] }
    const json = await res.json() as RawEnvelope
    const raw = json.data?.[0]
    const flight = raw ? mapFlight(raw as unknown as Parameters<typeof mapFlight>[0]) : null

    return Response.json(
      { flight, lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' } },
    )
  } catch {
    return Response.json(
      { flight: null },
      { headers: { 'Cache-Control': 'public, s-maxage=300' } },
    )
  }
}
