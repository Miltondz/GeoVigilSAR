export type ImagePhase = 'before' | 'after' | 'context'
export type ImageSource = 'mapillary' | 'wikimedia' | 'nasa-gibs'

export interface ZoneImage {
  id:           string
  url:          string       // display URL (may be a NASA GIBS WMS URL)
  thumbnailUrl?: string
  capturedAt?:  number       // ms UTC
  source:       ImageSource
  lat?:         number
  lng?:         number
  caption?:     string
  phase:        ImagePhase
}

// ── NASA GIBS (no API key, URL-based) ─────────────────────────────────────────

export function nasaGibsUrl(
  minLat: number, minLng: number, maxLat: number, maxLng: number,
  date: string,   // YYYY-MM-DD
  layer = 'VIIRS_SNPP_CorrectedReflectance_TrueColor'
): string {
  const layers = `${layer},Coastlines_15m`
  const bbox   = `${minLat},${minLng},${maxLat},${maxLng}`
  const base   = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi'
  return `${base}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${encodeURIComponent(layers)}&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=800&HEIGHT=400&FORMAT=image%2Fjpeg&TIME=${date}`
}

export function buildSatelliteImages(
  minLat: number, minLng: number, maxLat: number, maxLng: number,
  eventTime?: number   // ms UTC — if known, use day before/after
): ZoneImage[] {
  const today      = new Date()
  const todayStr   = today.toISOString().slice(0, 10)
  const yesterday  = new Date(today.getTime() - 86400000).toISOString().slice(0, 10)

  let beforeDates: string[]
  let afterDates:  string[]

  if (eventTime) {
    const ev   = new Date(eventTime)
    const day0 = ev.toISOString().slice(0, 10)
    const dm1  = new Date(eventTime - 86400000).toISOString().slice(0, 10)  // day before
    const dp1  = new Date(eventTime + 86400000).toISOString().slice(0, 10)  // +1
    const dp3  = new Date(eventTime + 3 * 86400000).toISOString().slice(0, 10)
    beforeDates = [dm1]
    afterDates  = [day0, dp1, dp3, todayStr].filter((d, i, a) => a.indexOf(d) === i)
  } else {
    const m30 = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    const m15 = new Date(today.getTime() - 15 * 86400000).toISOString().slice(0, 10)
    beforeDates = [m30, m15]
    afterDates  = [yesterday, todayStr]
  }

  const images: ZoneImage[] = []

  for (const d of beforeDates) {
    images.push({
      id:        `nasa-gibs-before-${d}`,
      url:       nasaGibsUrl(minLat, minLng, maxLat, maxLng, d),
      capturedAt: new Date(d).getTime(),
      source:    'nasa-gibs',
      phase:     'before',
      caption:   `Satélite — ${d}`,
    })
  }

  for (const d of afterDates) {
    images.push({
      id:        `nasa-gibs-after-${d}`,
      url:       nasaGibsUrl(minLat, minLng, maxLat, maxLng, d),
      capturedAt: new Date(d).getTime(),
      source:    'nasa-gibs',
      phase:     'after',
      caption:   `Satélite — ${d}`,
    })
  }

  return images
}

// ── Mapillary (server-side, uses MAPILLARY_CLIENT_TOKEN) ─────────────────────

interface MapillaryFeature {
  id: string
  thumb_1024_url?: string
  captured_at?: string
  geometry?: { type: string; coordinates: [number, number] }
}
interface MapillaryResponse {
  data: MapillaryFeature[]
}

export async function fetchMapillaryImages(
  minLat: number, minLng: number, maxLat: number, maxLng: number,
  phase: ImagePhase,
  eventTime?: number,
  token?: string
): Promise<ZoneImage[]> {
  if (!token) return []

  const params = new URLSearchParams({
    access_token: token,
    fields: 'id,thumb_1024_url,captured_at,geometry',
    bbox: `${minLng},${minLat},${maxLng},${maxLat}`,
    limit: phase === 'after' ? '8' : '4',
  })

  if (eventTime) {
    const ev = new Date(eventTime)
    if (phase === 'before') {
      params.set('end_captured_at', ev.toISOString())
      params.set('start_captured_at', new Date(eventTime - 180 * 86400000).toISOString())
    } else {
      params.set('start_captured_at', ev.toISOString())
    }
  } else if (phase === 'before') {
    params.set('end_captured_at', new Date(Date.now() - 30 * 86400000).toISOString())
  }

  try {
    const res = await fetch(`https://graph.mapillary.com/images?${params.toString()}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as MapillaryResponse

    return (data.data ?? []).map(f => ({
      id:          `mapillary-${f.id}`,
      url:         f.thumb_1024_url ?? `https://images.mapillary.com/${f.id}/thumb-1024.jpg`,
      capturedAt:  f.captured_at ? new Date(f.captured_at).getTime() : undefined,
      source:      'mapillary' as const,
      lat:         f.geometry?.coordinates[1],
      lng:         f.geometry?.coordinates[0],
      caption:     `Street view (Mapillary)`,
      phase,
    }))
  } catch {
    return []
  }
}

// ── Wikimedia Commons geo search (no API key) ─────────────────────────────────

interface GeoSearchPage { pageid: number; title: string }
interface ImageInfoPage {
  pageid: number
  imageinfo?: { url: string; thumburl?: string; timestamp: string; extmetadata?: { ImageDescription?: { value: string } } }[]
}
interface WikiResponse {
  query?: {
    geosearch?: GeoSearchPage[]
    pages?: Record<string, ImageInfoPage>
  }
}

export async function fetchWikimediaImages(
  lat: number, lng: number,
  radiusKm = 100
): Promise<ZoneImage[]> {
  try {
    // Step 1: geo search
    const gsUrl = new URL('https://commons.wikimedia.org/w/api.php')
    gsUrl.searchParams.set('action',      'query')
    gsUrl.searchParams.set('list',        'geosearch')
    gsUrl.searchParams.set('gscoord',     `${lat}|${lng}`)
    gsUrl.searchParams.set('gsradius',    (radiusKm * 1000).toString())
    gsUrl.searchParams.set('gslimit',     '12')
    gsUrl.searchParams.set('gsnamespace', '6')
    gsUrl.searchParams.set('format',      'json')
    gsUrl.searchParams.set('origin',      '*')

    const gsRes = await fetch(gsUrl.toString(), { signal: AbortSignal.timeout(6_000) })
    if (!gsRes.ok) return []
    const gsData = (await gsRes.json()) as WikiResponse
    const pages  = gsData.query?.geosearch ?? []
    if (pages.length === 0) return []

    // Step 2: get image URLs
    const ids = pages.slice(0, 10).map(p => p.pageid).join('|')
    const iiUrl = new URL('https://commons.wikimedia.org/w/api.php')
    iiUrl.searchParams.set('action',     'query')
    iiUrl.searchParams.set('pageids',    ids)
    iiUrl.searchParams.set('prop',       'imageinfo')
    iiUrl.searchParams.set('iiprop',     'url|timestamp|extmetadata')
    iiUrl.searchParams.set('iiurlwidth', '600')
    iiUrl.searchParams.set('format',     'json')
    iiUrl.searchParams.set('origin',     '*')

    const iiRes = await fetch(iiUrl.toString(), { signal: AbortSignal.timeout(6_000) })
    if (!iiRes.ok) return []
    const iiData = (await iiRes.json()) as WikiResponse

    const results: ZoneImage[] = []
    for (const page of Object.values(iiData.query?.pages ?? {})) {
      const info = page.imageinfo?.[0]
      if (!info?.url) continue

      // Skip SVG, OGV, audio
      if (/\.(svg|ogv|ogg|mp3|wav)$/i.test(info.url)) continue

      const description = info.extmetadata?.ImageDescription?.value ?? ''
      results.push({
        id:          `wikimedia-${page.pageid}`,
        url:         info.thumburl ?? info.url,
        capturedAt:  new Date(info.timestamp).getTime(),
        source:      'wikimedia',
        caption:     description.replace(/<[^>]+>/g, '').slice(0, 120) || 'Wikimedia Commons',
        phase:       'context',
      })
    }
    return results
  } catch {
    return []
  }
}
