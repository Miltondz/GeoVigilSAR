import { parseActiveStationsXml, parseLatestObs, inVeBbox, type BuoyStation } from '@/lib/ndbc'

export const revalidate = 1800

export async function GET() {
  try {
    const [catalogRes, obsRes] = await Promise.all([
      fetch('https://www.ndbc.noaa.gov/activestations.xml', { signal: AbortSignal.timeout(10_000), next: { revalidate: 86400 } }),
      fetch('https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt', { signal: AbortSignal.timeout(10_000) }),
    ])

    if (!catalogRes.ok || !obsRes.ok) throw new Error('NDBC unavailable')

    const [catalogXml, obsTxt] = await Promise.all([catalogRes.text(), obsRes.text()])

    const allStations = parseActiveStationsXml(catalogXml)
    const veStations  = allStations.filter(s => inVeBbox(s.lat, s.lng))
    const stationMap  = new Map<string, BuoyStation>(veStations.map(s => [s.id, s]))

    const buoys = parseLatestObs(obsTxt, stationMap)

    return Response.json(
      { buoys, count: buoys.length, lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600' } },
    )
  } catch {
    return Response.json(
      { buoys: [], count: 0, lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=300' } },
    )
  }
}
