import { NextRequest, NextResponse } from 'next/server'
import { fetchGDELTNews } from '@/lib/gdelt'
import { fetchReliefWebReports } from '@/lib/reliefweb'
import { fetchMultiSourceNews } from '@/lib/rss-news'
import { fetchMapillaryImages, fetchWikimediaImages, buildSatelliteImages } from '@/lib/imagery'
import { extractZoneInsights } from '@/lib/zone-ai-extract'

export const runtime = 'nodejs'

interface NominatimAddress {
  country?: string
  country_code?: string
}
interface NominatimResult {
  address?: NominatimAddress
  error?: string
}

async function reverseGeocode(lat: number, lng: number): Promise<{ country: string; countryIso2: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=3`,
      {
        headers: { 'User-Agent': 'GeoVigilSAR/1.0 (miltond.diaz@gmail.com)' },
        signal: AbortSignal.timeout(6_000),
      }
    )
    if (!res.ok) throw new Error()
    const data = (await res.json()) as NominatimResult
    if (data.error) throw new Error()
    return {
      country:     data.address?.country     ?? 'Unknown',
      countryIso2: (data.address?.country_code ?? '').toUpperCase(),
    }
  } catch {
    return { country: 'Unknown', countryIso2: '' }
  }
}

const ISO2_TO_ISO3: Record<string, string> = {
  JP: 'JPN', TR: 'TUR', ID: 'IDN', PH: 'PHL', CL: 'CHL', PE: 'PER',
  MX: 'MEX', CO: 'COL', VE: 'VEN', EC: 'ECU', NZ: 'NZL', GR: 'GRC',
  IT: 'ITA', IR: 'IRN', PK: 'PAK', AF: 'AFG', NP: 'NPL', CN: 'CHN',
  RU: 'RUS', US: 'USA', CA: 'CAN', IN: 'IND', MM: 'MMR', KZ: 'KAZ',
  UZ: 'UZB', TJ: 'TJK', KG: 'KGZ', AZ: 'AZE', AM: 'ARM', GE: 'GEO',
  AL: 'ALB', MK: 'MKD', RS: 'SRB', HR: 'HRV', RO: 'ROU', BG: 'BGR',
  BO: 'BOL', AR: 'ARG', HT: 'HTI', GT: 'GTM', SV: 'SLV', HN: 'HND',
  NI: 'NIC', CR: 'CRI', PA: 'PAN', JM: 'JAM', CU: 'CUB', DO: 'DOM',
  MA: 'MAR', DZ: 'DZA', TN: 'TUN', EG: 'EGY', ET: 'ETH', SO: 'SOM',
  KE: 'KEN', TZ: 'TZA', MZ: 'MOZ', MW: 'MWI', ZW: 'ZWE',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat      = parseFloat(searchParams.get('lat')    ?? '0')
  const lng      = parseFloat(searchParams.get('lng')    ?? '0')
  const minLat   = parseFloat(searchParams.get('minLat') ?? String(lat - 3))
  const maxLat   = parseFloat(searchParams.get('maxLat') ?? String(lat + 3))
  const minLng   = parseFloat(searchParams.get('minLng') ?? String(lng - 3))
  const maxLng   = parseFloat(searchParams.get('maxLng') ?? String(lng + 3))
  const eventTimeParam = searchParams.get('eventTime')
  const eventTime = eventTimeParam ? parseInt(eventTimeParam, 10) : undefined
  const limit    = parseInt(searchParams.get('limit') ?? '20', 10)

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
  }

  // 1. Reverse geocode (fast, do first)
  const { country, countryIso2 } = await reverseGeocode(lat, lng)
  const iso3       = ISO2_TO_ISO3[countryIso2] ?? ''
  const zone       = { country, countryIso2, lat, lng }

  // Keywords for filtering RSS
  const baseKeywords = ['earthquake', 'terremoto', 'sismo', 'seismic']

  // 2. Fetch everything in parallel
  const mapillaryToken = process.env.MAPILLARY_CLIENT_TOKEN

  const [
    gdeltResult,
    rssResult,
    reliefResult,
    mapillaryBeforeResult,
    mapillaryAfterResult,
    wikimediaResult,
  ] = await Promise.allSettled([
    // GDELT — best for geo-keyword news (includes Reuters, AP, AFP)
    fetchGDELTNews(
      country !== 'Unknown'
        ? `earthquake (${country} OR terremoto OR sismo)`
        : 'earthquake terremoto sismo',
      { maxRecords: limit, timespanMinutes: 10080 }
    ),
    // RSS multi-source (BBC + Al Jazeera + EMSC)
    fetchMultiSourceNews(country, baseKeywords),
    // ReliefWeb humanitarian reports
    iso3 ? fetchReliefWebReports(iso3, 8) : Promise.resolve([]),
    // Mapillary before-event street photos
    fetchMapillaryImages(minLat, minLng, maxLat, maxLng, 'before', eventTime, mapillaryToken),
    // Mapillary after-event street photos (more images)
    fetchMapillaryImages(minLat, minLng, maxLat, maxLng, 'after', eventTime, mapillaryToken),
    // Wikimedia Commons context images
    fetchWikimediaImages(lat, lng, Math.min((maxLat - minLat) * 110 * 0.5, 200)),
  ])

  // Merge news sources — GDELT + RSS, deduplicate, sort by recency
  const gdeltNews = gdeltResult.status  === 'fulfilled' ? gdeltResult.value  : []
  const rssNews   = rssResult.status    === 'fulfilled' ? rssResult.value    : []
  const allNews   = [...gdeltNews, ...rssNews]
  const seen      = new Set<string>()
  const news      = allNews
    .filter(n => { if (seen.has(n.url)) return false; seen.add(n.url); return true })
    .sort((a, b) => b.publishedAt - a.publishedAt)

  const reports = reliefResult.status === 'fulfilled' ? reliefResult.value : []

  // Combine images: before (few) + after (more) + context
  const mapBefore  = mapillaryBeforeResult.status === 'fulfilled' ? mapillaryBeforeResult.value : []
  const mapAfter   = mapillaryAfterResult.status  === 'fulfilled' ? mapillaryAfterResult.value  : []
  const wikimedia  = wikimediaResult.status        === 'fulfilled' ? wikimediaResult.value       : []
  const satellite  = buildSatelliteImages(minLat, minLng, maxLat, maxLng, eventTime)

  // Target ratio: 1 before : 3 after. Max 12 images total.
  const images = [
    ...satellite,                      // 1-2 before + 3-4 after
    ...mapBefore.slice(0, 2),
    ...mapAfter.slice(0, 5),
    ...wikimedia.slice(0, 4),
  ]

  // 3. AI extraction (runs after news is known)
  let aiExtract = null
  if (news.length > 0 || reports.length > 0) {
    try {
      aiExtract = await extractZoneInsights(zone, news, reports)
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({
    zone,
    news,
    reports,
    images,
    aiExtract,
    sources: {
      gdelt:     gdeltNews.length,
      rss:       rssNews.length,
      reliefWeb: reports.length,
      mapillary: mapBefore.length + mapAfter.length,
      wikimedia: wikimedia.length,
      satellite: satellite.length,
    },
    fetchedAt: Date.now(),
  })
}
