import { mapWeather, type WeatherPoint } from '@/lib/open-meteo'

export const revalidate = 900

const PARAMS = [
  'temperature_2m', 'relative_humidity_2m', 'precipitation',
  'weather_code', 'cloud_cover', 'wind_speed_10m',
  'wind_direction_10m', 'wind_gusts_10m',
].join(',')

async function fetchPoint(lat: number, lng: number): Promise<WeatherPoint | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=${PARAMS}&hourly=visibility&timezone=auto&wind_speed_unit=ms`
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return null
    const json = await res.json()
    return mapWeather(json)
  } catch {
    return null
  }
}

// Default single point: Venezuela epicenter
const DEFAULT_LAT = 10.4
const DEFAULT_LNG = -68.7

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? String(DEFAULT_LAT))
  const lng = parseFloat(searchParams.get('lng') ?? String(DEFAULT_LNG))
  const grid = searchParams.get('grid') === '1'

  let points: WeatherPoint[]

  if (grid) {
    // 3×3 sample grid — 9 concurrent calls
    const offsets = [-1.5, 0, 1.5]
    const results = await Promise.all(
      offsets.flatMap(dlat =>
        offsets.map(dlng => fetchPoint(lat + dlat, lng + dlng)),
      ),
    )
    points = results.filter((p): p is WeatherPoint => p !== null)
  } else {
    const p = await fetchPoint(isNaN(lat) ? DEFAULT_LAT : lat, isNaN(lng) ? DEFAULT_LNG : lng)
    points = p ? [p] : []
  }

  return Response.json(
    { points, count: points.length, lastUpdated: Date.now() },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' } },
  )
}
