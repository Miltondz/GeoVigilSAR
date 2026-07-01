import { searchProducts } from '@/lib/copernicus'

export type ImagePhase = 'before' | 'after' | 'context'
export type ImageSource = 'mapillary' | 'wikimedia' | 'sentinel2' | 'esri'

export interface ZoneImage {
  id:           string
  url:          string       // display URL
  thumbnailUrl?: string
  capturedAt?:  number       // ms UTC
  source:       ImageSource
  lat?:         number
  lng?:         number
  caption?:     string
  phase:        ImagePhase
}

// ── ESRI World Imagery (no API key, free public tile export service — already
// used as the app's satellite basemap). No historical dates, but sub-meter
// resolution in well-covered areas — a genuinely close "now" reference shot
// for locations where Mapillary/Sentinel-2 have nothing usable.

export function esriWorldImageryUrl(
  minLat: number, minLng: number, maxLat: number, maxLng: number,
  size = 1024
): string {
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`
  const base = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export'
  return `${base}?bbox=${bbox}&bboxSR=4326&size=${size},${size}&imageSR=4326&format=jpg&f=image`
}

export function buildCloseAerialImage(lat: number, lng: number): ZoneImage {
  const SPAN = 0.01 // degrees (~1.1km) — tight enough for building-scale detail where source resolution allows
  return {
    id:      `esri-${lat.toFixed(4)}-${lng.toFixed(4)}`,
    url:     esriWorldImageryUrl(lat - SPAN, lng - SPAN, lat + SPAN, lng + SPAN),
    source:  'esri',
    caption: 'ESRI World Imagery — vista actual',
    phase:   'context',
  }
}

// ── Sentinel-2 (CDSE, ~10m resolution — a real close aerial view vs. GIBS'
// wide continental swath). Uses the same search already powering the
// InSAR/optical pre-post layers, generalized to any bbox, not just VEN-2406.

export async function fetchSentinelImages(
  bbox: [number, number, number, number], // [west, south, east, north] — keep this tight/local
  eventTime?: number
): Promise<ZoneImage[]> {
  const now = Date.now()
  const beforeEnd   = eventTime ?? now - 30 * 86400000
  const beforeStart = beforeEnd - 60 * 86400000
  const afterStart  = eventTime ?? now - 30 * 86400000

  // Fetch more candidates than we need, then keep the clearest — a recent but
  // 90%-cloud scene is useless as an aerial view even though it's the "latest".
  const [beforeCandidates, afterCandidates] = await Promise.all([
    searchProducts({
      collection: 'SENTINEL-2', bbox, productType: 'S2MSI2A', limit: 8,
      startDate: new Date(beforeStart).toISOString(),
      endDate:   new Date(beforeEnd).toISOString(),
    }),
    searchProducts({
      collection: 'SENTINEL-2', bbox, productType: 'S2MSI2A', limit: 8,
      startDate: new Date(afterStart).toISOString(),
      endDate:   new Date(now).toISOString(),
    }),
  ])

  const byClearest = (a: { cloudCover?: number }, b: { cloudCover?: number }) =>
    (a.cloudCover ?? 100) - (b.cloudCover ?? 100)

  const before = [...beforeCandidates].sort(byClearest).slice(0, 2)
  const after  = [...afterCandidates].sort(byClearest).slice(0, 3)

  const toImage = (phase: ImagePhase) => (p: { id: string; startDate: string; quicklookUrl: string; cloudCover?: number }): ZoneImage => ({
    id:         `sentinel2-${p.id}`,
    url:        p.quicklookUrl,
    capturedAt: new Date(p.startDate).getTime(),
    source:     'sentinel2',
    caption:    `Sentinel-2 — ${p.startDate.slice(0, 10)}${p.cloudCover != null ? ` · ${Math.round(p.cloudCover)}% nubes` : ''}`,
    phase,
  })

  return [...before.map(toImage('before')), ...after.map(toImage('after'))]
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
