import { VE_AIRPORTS, mapAirport, type AviationAirport } from '@/lib/aviationstack'

export const revalidate = 2592000 // 30 days

export async function GET() {
  const key = process.env.AVIATIONSTACK_KEY
  if (!key) {
    return Response.json(
      { airports: VE_AIRPORTS, count: VE_AIRPORTS.length, source: 'fallback', lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400' } },
    )
  }

  try {
    // HTTP only on free tier — proxied server-side avoids mixed-content
    const res = await fetch(
      `http://api.aviationstack.com/v1/airports?access_key=${key}&country_iso2=VE&limit=100`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) throw new Error(`aviationstack ${res.status}`)

    interface RawEnvelope { data?: Record<string, string>[] }
    const json = await res.json() as RawEnvelope
    const airports: AviationAirport[] = (json.data ?? [])
      .filter(r => r.iata_code && r.latitude && r.longitude)
      .map(r => mapAirport(r as unknown as Parameters<typeof mapAirport>[0]))

    const result = airports.length > 0 ? airports : VE_AIRPORTS

    return Response.json(
      { airports: result, count: result.length, source: airports.length > 0 ? 'api' : 'fallback', lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400' } },
    )
  } catch {
    return Response.json(
      { airports: VE_AIRPORTS, count: VE_AIRPORTS.length, source: 'fallback', lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=86400' } },
    )
  }
}
