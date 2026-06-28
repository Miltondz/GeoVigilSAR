import { buildInfraQuery, buildRoadsQuery, mapElements, mapRoads, bboxToOverpass } from '@/lib/overpass'

export const revalidate = 3600

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function queryOverpass(body: string): Promise<unknown> {
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'text/plain' },
        signal: AbortSignal.timeout(30_000),
      })
      if (res.ok) return res.json()
    } catch {
      // try next mirror
    }
  }
  throw new Error('All Overpass mirrors failed')
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const bboxParam = searchParams.get('bbox') // "minLng,minLat,maxLng,maxLat"
  const roads     = searchParams.get('roads') === '1'

  let overpassBbox: string | null = null
  if (bboxParam) {
    const [minLng, minLat, maxLng, maxLat] = bboxParam.split(',').map(Number)
    overpassBbox = bboxToOverpass(minLng, minLat, maxLng, maxLat)
  }

  if (!overpassBbox) {
    // Default: La Guaira/Caracas damage corridor
    overpassBbox = '10.0,-67.5,11.5,-66.0'
  }

  try {
    if (roads) {
      const [infraRaw, roadsRaw] = await Promise.all([
        queryOverpass(buildInfraQuery(overpassBbox)),
        queryOverpass(buildRoadsQuery(overpassBbox)),
      ])
      const features = mapElements(infraRaw as Parameters<typeof mapElements>[0])
      const roadList = mapRoads(roadsRaw as Parameters<typeof mapRoads>[0])

      return Response.json(
        { features, roads: roadList, count: features.length, lastUpdated: Date.now() },
        { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' } },
      )
    }

    const raw = await queryOverpass(buildInfraQuery(overpassBbox))
    const features = mapElements(raw as Parameters<typeof mapElements>[0])

    return Response.json(
      { features, count: features.length, lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' } },
    )
  } catch {
    return Response.json(
      { features: [], count: 0, lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=300' } },
    )
  }
}
