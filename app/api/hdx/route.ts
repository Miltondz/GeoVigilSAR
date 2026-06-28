import { mapDataset, pickGeoJsonResource, pickCsvResource, parseCsvPop, HDX_SLUGS, type AdminBoundary, type PopulationStat } from '@/lib/hdx'

export const revalidate = 86400

const CKAN = 'https://data.humdata.org/api/3/action'

async function fetchDataset(slug: string) {
  const res = await fetch(`${CKAN}/package_show?id=${slug}`, { signal: AbortSignal.timeout(12_000) })
  if (!res.ok) return null
  interface CkanEnvelope { success: boolean; result: unknown }
  const json = await res.json() as CkanEnvelope
  if (!json.success) return null
  return mapDataset(json.result as Parameters<typeof mapDataset>[0])
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const kind = searchParams.get('kind') ?? 'admin' // 'admin' | 'population'

  if (kind === 'population') {
    try {
      const ds = await fetchDataset(HDX_SLUGS.population)
      if (!ds) throw new Error('HDX population dataset not found')
      const csvRes = pickCsvResource(ds)
      if (!csvRes) throw new Error('No CSV resource')
      const csvFetch = await fetch(csvRes.url, { signal: AbortSignal.timeout(15_000) })
      if (!csvFetch.ok) throw new Error('CSV fetch failed')
      const csv  = await csvFetch.text()
      const stats: PopulationStat[] = parseCsvPop(csv)
      return Response.json(
        { stats, count: stats.length, lastUpdated: Date.now() },
        { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' } },
      )
    } catch {
      return Response.json(
        { stats: [], count: 0, lastUpdated: Date.now() },
        { headers: { 'Cache-Control': 'public, s-maxage=3600' } },
      )
    }
  }

  // Default: admin boundaries
  try {
    const ds = await fetchDataset(HDX_SLUGS.adminBoundaries)
    if (!ds) throw new Error('HDX admin dataset not found')
    const gjRes = pickGeoJsonResource(ds)
    if (!gjRes) throw new Error('No GeoJSON resource')
    const gjFetch = await fetch(gjRes.url, { signal: AbortSignal.timeout(20_000) })
    if (!gjFetch.ok) throw new Error('GeoJSON fetch failed')
    const fc = await gjFetch.json() as GeoJSON.FeatureCollection

    const boundaries: AdminBoundary[] = (fc.features ?? []).map(f => ({
      adminLevel: (f.properties?.admin_level ?? f.properties?.adm_level ?? 1) as 0 | 1 | 2,
      name:       String(f.properties?.shapeName ?? f.properties?.name ?? ''),
      pcode:      String(f.properties?.shapeISO ?? f.properties?.pcode ?? f.properties?.ADM1_PCODE ?? ''),
      geometry:   f.geometry as AdminBoundary['geometry'],
    }))

    return Response.json(
      { boundaries, count: boundaries.length, lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' } },
    )
  } catch {
    return Response.json(
      { boundaries: [], count: 0, lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=3600' } },
    )
  }
}
