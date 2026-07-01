import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 3600

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  type: string
  class: string
  boundingbox?: [string, string, string, string] // [south, north, west, east]
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const q = (searchParams.get('q') ?? '').trim()

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    // viewbox: minLng,minLat,maxLng,maxLat → Venezuela bbox, used as a soft
    // ranking bias only (bounded=0) so global places (e.g. "Chile") still
    // resolve — bounded=1 would exclude anything outside Venezuela entirely.
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(q)}&format=json&limit=5` +
      `&viewbox=-74,0,-59,13&bounded=0`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'GeoVigilSAR/1.0 (portfolio project)',
        'Accept-Language': 'es,en',
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      return NextResponse.json({ results: [] })
    }

    // Some countries' OSM relations include remote overseas territories
    // (e.g. Chile's bbox stretches to Easter Island, ~2500km offshore) which
    // would center the viewport in open ocean. Clamp to a max span around
    // the result's own point so the map still fits large mainlands without
    // including territories far away. Countries are far more often elongated
    // north-south than east-west, and remote exclaves are typically islands
    // further out in longitude — so the lng cap is tighter than the lat cap.
    const MAX_LAT_SPAN = 15
    const MAX_LNG_SPAN = 6
    const clampBbox = (
      lat: number, lng: number, boundingbox: [string, string, string, string]
    ): [number, number, number, number] => [
      Math.max(parseFloat(boundingbox[0]), lat - MAX_LAT_SPAN),
      Math.min(parseFloat(boundingbox[1]), lat + MAX_LAT_SPAN),
      Math.max(parseFloat(boundingbox[2]), lng - MAX_LNG_SPAN),
      Math.min(parseFloat(boundingbox[3]), lng + MAX_LNG_SPAN),
    ]

    const data = (await res.json()) as NominatimResult[]
    const results = data.map(r => {
      const lat = parseFloat(r.lat)
      const lng = parseFloat(r.lon)
      return {
        lat,
        lng,
        name: r.display_name,
        type: r.type,
        // [minLat, maxLat, minLng, maxLng] — lets the map fit the whole place
        // (country/city/street) instead of flying to a fixed zoom level
        bbox: r.boundingbox ? clampBbox(lat, lng, r.boundingbox) : undefined,
      }
    })

    return NextResponse.json({ results })
  } catch {
    // Nominatim unavailable or timed out — return empty, never 500
    return NextResponse.json({ results: [] })
  }
}
