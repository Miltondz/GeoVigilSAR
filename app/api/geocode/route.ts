import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 3600

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  type: string
  class: string
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

    // viewbox: minLng,minLat,maxLng,maxLat  → Venezuela bbox
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(q)}&format=json&limit=5` +
      `&viewbox=-74,0,-59,13&bounded=1`

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

    const data = (await res.json()) as NominatimResult[]
    const results = data.map(r => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      name: r.display_name,
      type: r.type,
    }))

    return NextResponse.json({ results })
  } catch {
    // Nominatim unavailable or timed out — return empty, never 500
    return NextResponse.json({ results: [] })
  }
}
