import { NextRequest, NextResponse } from 'next/server'
import { fetchGDELTNews } from '@/lib/gdelt'
import { fetchReliefWebReports } from '@/lib/reliefweb'

export const runtime = 'nodejs'
// No cache — user-triggered endpoint

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
    if (!res.ok) throw new Error('Nominatim error')
    const data = (await res.json()) as NominatimResult
    if (data.error) throw new Error(data.error)
    return {
      country:     data.address?.country     ?? 'Unknown',
      countryIso2: (data.address?.country_code ?? '').toUpperCase(),
    }
  } catch {
    return { country: 'Unknown', countryIso2: '' }
  }
}

// ISO2 → ISO3 for ReliefWeb (only most common seismically-active countries)
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
  const lat    = parseFloat(searchParams.get('lat')    ?? '0')
  const lng    = parseFloat(searchParams.get('lng')    ?? '0')
  const limit  = parseInt  (searchParams.get('limit')  ?? '20', 10)

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
  }

  // 1. Reverse geocode center
  const { country, countryIso2 } = await reverseGeocode(lat, lng)
  const iso3 = ISO2_TO_ISO3[countryIso2] ?? ''

  // 2. Build GDELT query
  const gdeltQuery = country !== 'Unknown'
    ? `earthquake (${country} OR terremoto)`
    : 'earthquake terremoto seismo'

  // 3. Fetch in parallel
  const [newsItems, reports] = await Promise.allSettled([
    fetchGDELTNews(gdeltQuery, { maxRecords: limit, timespanMinutes: 10080 /* 7 days */ }),
    iso3
      ? fetchReliefWebReports(iso3, 8)
      : Promise.resolve([]),
  ])

  return NextResponse.json({
    zone: { country, countryIso2, lat, lng },
    news:    newsItems.status === 'fulfilled'  ? newsItems.value  : [],
    reports: reports.status  === 'fulfilled'   ? reports.value    : [],
    fetchedAt: Date.now(),
  })
}
