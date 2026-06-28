export interface HdxResource {
  id: string
  name: string
  format: string
  url: string
}

export interface HdxDataset {
  id: string
  name: string
  title: string
  organization: string
  resources: HdxResource[]
}

export interface AdminBoundary {
  adminLevel: 0 | 1 | 2
  name: string
  pcode: string
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
}

export interface PopulationStat {
  pcode: string
  name: string
  population: number
}

interface RawCkanDataset {
  id: string
  name: string
  title: string
  organization: { title: string } | null
  resources: { id: string; name: string; format: string; url: string }[]
}

export function mapDataset(r: RawCkanDataset): HdxDataset {
  return {
    id:           r.id,
    name:         r.name,
    title:        r.title,
    organization: r.organization?.title ?? 'Unknown',
    resources:    r.resources.map(res => ({
      id:     res.id,
      name:   res.name,
      format: res.format.toUpperCase(),
      url:    res.url,
    })),
  }
}

export function pickGeoJsonResource(ds: HdxDataset): HdxResource | null {
  return ds.resources.find(r => r.format === 'GEOJSON' || r.format === 'JSON') ?? null
}

export function pickCsvResource(ds: HdxDataset): HdxResource | null {
  return ds.resources.find(r => r.format === 'CSV') ?? null
}

export function mergeBoundariesWithPop(
  boundaries: AdminBoundary[],
  pop: PopulationStat[],
): (AdminBoundary & { population: number | null })[] {
  const popMap = new Map(pop.map(p => [p.pcode, p.population]))
  return boundaries.map(b => ({
    ...b,
    population: popMap.get(b.pcode) ?? null,
  }))
}

// Parse simple CSV population — normalizes multiple possible column names
export function parseCsvPop(csv: string): PopulationStat[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
  const pcodeIdx = headers.findIndex(h => h.includes('pcode') || h.includes('p_code'))
  const nameIdx  = headers.findIndex(h => h === 'name' || h === 'adm1_en' || h === 'shapename')
  const popIdx   = headers.findIndex(h =>
    h === 'population' || h === 't_tl' || h.startsWith('p_202') || h === 'pop_2020'
  )
  if (pcodeIdx < 0 || popIdx < 0) return []

  const stats: PopulationStat[] = []
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
    const pop  = parseInt(cols[popIdx] ?? '')
    if (isNaN(pop)) continue
    stats.push({
      pcode:      cols[pcodeIdx] ?? '',
      name:       nameIdx >= 0 ? (cols[nameIdx] ?? '') : '',
      population: pop,
    })
  }
  return stats
}

// Curated HDX dataset slugs for Venezuela (stable, verified)
export const HDX_SLUGS = {
  adminBoundaries: 'cod-ab-ven',
  population:      'venezuela-population-statistics',
} as const
