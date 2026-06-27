export interface HotProject {
  id: number
  name: string
  status: string
  percentMapped: number
  percentValidated: number
  created: string
  lastUpdated: string
  centroid: [number, number] // [lng, lat]
}

interface RawHotProject {
  id?: number
  name?: string
  status?: string
  percentMapped?: number
  percentValidated?: number
  created?: string
  lastUpdated?: string
  centroid?: {
    type?: string
    coordinates?: [number, number]
  }
  [key: string]: unknown
}

function isRawHotProject(val: unknown): val is RawHotProject {
  return typeof val === 'object' && val !== null
}

interface HotApiResponse {
  results?: unknown[]
  [key: string]: unknown
}

function isHotApiResponse(val: unknown): val is HotApiResponse {
  return typeof val === 'object' && val !== null
}

export async function fetchHotProjects(params: {
  search?: string
  bbox?: [number, number, number, number]
} = {}): Promise<HotProject[]> {
  const { search = 'venezuela earthquake' } = params

  const qs = new URLSearchParams({ search, page: '1' })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    let res: Response
    try {
      res = await fetch(
        `https://tasks.hotosm.org/api/v8/projects/?${qs.toString()}`,
        {
          signal: controller.signal,
          next: { revalidate: 1800 },
          headers: { 'Accept': 'application/json' },
        }
      )
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      console.warn(`[HOT OSM] API returned ${res.status}`)
      return []
    }

    const data: unknown = await res.json()

    if (!isHotApiResponse(data)) {
      console.warn('[HOT OSM] Unexpected response shape')
      return []
    }

    const rawList = data.results ?? []
    if (!Array.isArray(rawList)) return []

    const projects: HotProject[] = []

    for (const item of rawList) {
      if (!isRawHotProject(item)) continue

      const id = typeof item.id === 'number' ? item.id : 0
      const name = typeof item.name === 'string' ? item.name : `HOT Project ${id}`
      const status = typeof item.status === 'string' ? item.status : 'UNKNOWN'
      const percentMapped = typeof item.percentMapped === 'number' ? item.percentMapped : 0
      const percentValidated = typeof item.percentValidated === 'number' ? item.percentValidated : 0
      const created = typeof item.created === 'string' ? item.created : ''
      const lastUpdated = typeof item.lastUpdated === 'string' ? item.lastUpdated : ''

      let centroid: [number, number] = [0, 0]
      if (item.centroid?.coordinates && Array.isArray(item.centroid.coordinates)) {
        centroid = [item.centroid.coordinates[0] ?? 0, item.centroid.coordinates[1] ?? 0]
      }

      projects.push({ id, name, status, percentMapped, percentValidated, created, lastUpdated, centroid })
    }

    return projects
  } catch (err) {
    console.warn('[HOT OSM] Fetch failed:', err)
    return []
  }
}
