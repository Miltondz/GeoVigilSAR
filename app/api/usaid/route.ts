import { mapDeclaration, venezuelaCentroid, SOCRATA_BASE, type UsaidDeclaration } from '@/lib/usaid'

export const revalidate = 21600

async function fromSocrata(): Promise<UsaidDeclaration[]> {
  // Discover dataset via catalog search
  const catalogRes = await fetch(
    `${SOCRATA_BASE}/api/catalog/v1?q=disaster+declaration+venezuela&limit=5`,
    { signal: AbortSignal.timeout(10_000) },
  )
  if (!catalogRes.ok) throw new Error('Socrata catalog failed')
  interface CatalogResult { results?: { resource?: { id?: string } }[] }
  const catalog = await catalogRes.json() as CatalogResult
  const datasetId = catalog.results?.[0]?.resource?.id
  if (!datasetId) throw new Error('No USAID dataset found')

  const dataRes = await fetch(
    `${SOCRATA_BASE}/resource/${datasetId}.json?$where=country_name='Venezuela' OR country='Venezuela'&$limit=50`,
    { signal: AbortSignal.timeout(10_000) },
  )
  if (!dataRes.ok) throw new Error(`Socrata data ${dataRes.status}`)

  const rows = await dataRes.json() as Record<string, string | undefined>[]
  const centroid = venezuelaCentroid()

  return rows.map(r => {
    const d = mapDeclaration(r)
    if (d.lat === null || d.lng === null) {
      d.lat = centroid.lat
      d.lng = centroid.lng
    }
    return d
  })
}

async function fromReliefWeb(): Promise<UsaidDeclaration[]> {
  const res = await fetch(
    'https://api.reliefweb.int/v1/disasters?filter[field]=country.iso3&filter[value]=VEN&filter[field]=type.code&filter[value]=EQ&limit=10&sort[]=date:desc',
    { signal: AbortSignal.timeout(10_000) },
  )
  if (!res.ok) return []
  interface RwItem { id: number; fields?: { name?: string; date?: { created?: string }; status?: string } }
  interface RwEnvelope { data?: RwItem[] }
  const json = await res.json() as RwEnvelope
  const centroid = venezuelaCentroid()

  return (json.data ?? []).map(item => ({
    id:              String(item.id),
    country:         'Venezuela',
    disasterType:    'Earthquake',
    declarationDate: item.fields?.date?.created ?? '',
    fiscalYear:      new Date(item.fields?.date?.created ?? '').getFullYear() || 2026,
    status:          item.fields?.status === 'alert' ? 'active' : 'closed',
    fundingUsd:      null,
    lat:             centroid.lat,
    lng:             centroid.lng,
    description:     item.fields?.name ?? 'Venezuela Earthquake',
  } satisfies UsaidDeclaration))
}

export async function GET() {
  let declarations: UsaidDeclaration[] = []
  let source: 'socrata' | 'reliefweb' = 'reliefweb'

  try {
    declarations = await fromSocrata()
    source = 'socrata'
  } catch {
    try {
      declarations = await fromReliefWeb()
      source = 'reliefweb'
    } catch {
      declarations = []
    }
  }

  return Response.json(
    { declarations, count: declarations.length, source, lastUpdated: Date.now() },
    { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=7200' } },
  )
}
