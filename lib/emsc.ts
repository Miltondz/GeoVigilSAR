export interface EmscEvent {
  id: string
  magnitude: number
  time: string // ISO
  lat: number
  lng: number
  depth: number
  region: string // flynn_region
  source: 'EMSC'
}

interface EmscFeatureProperties {
  mag?: number
  time?: string
  depth?: number
  flynn_region?: string
  unid?: string
}

interface EmscFeature {
  id?: string
  properties?: EmscFeatureProperties
  geometry?: { coordinates?: [number, number, number] }
}

interface EmscResponse {
  features?: EmscFeature[]
}

function isEmscResponse(data: unknown): data is EmscResponse {
  return typeof data === 'object' && data !== null && 'features' in data
}

export async function fetchEmscEvents(params: {
  minMag?: number
  bbox: [number, number, number, number] // [west, south, east, north]
  limit?: number
}): Promise<EmscEvent[]> {
  const { minMag = 2.0, bbox, limit = 200 } = params
  const [west, south, east, north] = bbox

  const qs = new URLSearchParams({
    format: 'json',
    minmag: minMag.toString(),
    minlat: south.toString(),
    maxlat: north.toString(),
    minlon: west.toString(),
    maxlon: east.toString(),
    limit: limit.toString(),
    orderby: 'time',
  })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    let res: Response
    try {
      res = await fetch(
        `https://www.seismicportal.eu/fdsnws/event/1/query?${qs.toString()}`,
        { signal: controller.signal, next: { revalidate: 60 } }
      )
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      console.warn(`[EMSC] API returned ${res.status}`)
      return []
    }

    const data: unknown = await res.json()

    if (!isEmscResponse(data)) {
      console.warn('[EMSC] Unexpected response shape')
      return []
    }

    const features = data.features ?? []
    const events: EmscEvent[] = []

    for (const f of features) {
      const props = f.properties ?? {}
      const coords = f.geometry?.coordinates

      if (!coords || coords.length < 3) continue
      const mag = props.mag ?? 0
      const time = props.time ?? ''
      const depth = props.depth ?? coords[2] ?? 0
      const region = props.flynn_region ?? ''
      const id = props.unid ?? f.id ?? `emsc-${time}-${mag}`

      events.push({
        id,
        magnitude: mag,
        time,
        lat: coords[1],
        lng: coords[0],
        depth,
        region,
        source: 'EMSC',
      })
    }

    return events
  } catch (err) {
    console.warn('[EMSC] Fetch failed:', err)
    return []
  }
}
