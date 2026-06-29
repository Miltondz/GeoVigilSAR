// GET /api/aircraft/[icao24]
// Enriches an aircraft with type, registration, and flight route data.
// Primary: OpenSky metadata + flight-history APIs (requires credentials).
// Fallback: infer approximate route from position+heading query params.

import { type NextRequest, NextResponse } from 'next/server'
import { lookupAirport, AIRPORTS } from '@/lib/airports'
import type { FlightAirport, FlightRoute } from '@/lib/airports'

export const runtime  = 'nodejs'
export const revalidate = 300

function osHeaders(): Record<string, string> {
  const id  = process.env.OPENSKY_CLIENT_ID
  const sec = process.env.OPENSKY_CLIENT_SECRET
  if (!id || !sec) return {}
  const b64 = Buffer.from(`${id}:${sec}`).toString('base64')
  return { Authorization: `Basic ${b64}` }
}

async function fetchMeta(icao24: string): Promise<{
  typecode:     string | null
  model:        string | null
  registration: string | null
  operator:     string | null
}> {
  const headers = osHeaders()
  if (!Object.keys(headers).length) return { typecode: null, model: null, registration: null, operator: null }

  try {
    const res = await fetch(
      `https://opensky-network.org/api/metadata/aircraft/icao/${icao24}`,
      { headers, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return { typecode: null, model: null, registration: null, operator: null }

    const d = await res.json() as {
      typecode?:     string
      icaotypecode?: string
      model?:        string
      manufacturername?: string
      registration?: string
      operatorcallsign?: string
      owner?: string
    }

    return {
      typecode:     d.typecode ?? d.icaotypecode ?? null,
      model:        [d.manufacturername, d.model].filter(Boolean).join(' ') || null,
      registration: d.registration ?? null,
      operator:     d.operatorcallsign ?? d.owner ?? null,
    }
  } catch {
    return { typecode: null, model: null, registration: null, operator: null }
  }
}

async function fetchFlight(icao24: string): Promise<{
  departureAirport: string | null
  arrivalAirport:   string | null
}> {
  const headers = osHeaders()
  if (!Object.keys(headers).length) return { departureAirport: null, arrivalAirport: null }

  const end   = Math.floor(Date.now() / 1000)
  const begin = end - 86400

  try {
    const res = await fetch(
      `https://opensky-network.org/api/flights/aircraft?icao24=${icao24}&begin=${begin}&end=${end}`,
      { headers, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return { departureAirport: null, arrivalAirport: null }

    const flights = await res.json() as Array<{
      firstSeen: number; lastSeen: number
      estDepartureAirport: string | null; estArrivalAirport: string | null
    }>

    if (!Array.isArray(flights) || flights.length === 0) {
      return { departureAirport: null, arrivalAirport: null }
    }

    const latest = flights.reduce((a, b) => (a.firstSeen > b.firstSeen ? a : b))
    return {
      departureAirport: latest.estDepartureAirport ?? null,
      arrivalAirport:   latest.estArrivalAirport   ?? null,
    }
  } catch {
    return { departureAirport: null, arrivalAirport: null }
  }
}

// Haversine distance in km
function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Project (lat, lng) by distKm in direction bearingDeg
function project(lat: number, lng: number, bearingDeg: number, distKm: number): [number, number] {
  const R = 6371
  const d = distKm / R
  const b = bearingDeg * Math.PI / 180
  const lat1 = lat * Math.PI / 180
  const lng1 = lng * Math.PI / 180
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b))
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return [lat2 * 180 / Math.PI, lng2 * 180 / Math.PI]
}

function nearestAirport(lat: number, lng: number, exclude?: string): FlightAirport | null {
  let best: FlightAirport | null = null
  let bestDist = Infinity
  for (const ap of AIRPORTS) {
    if (exclude && (ap.icao === exclude || ap.iata === exclude)) continue
    const d = distKm(lat, lng, ap.lat, ap.lng)
    if (d < bestDist) { bestDist = d; best = ap }
  }
  return best
}

// Infer approximate departure/arrival airports from position + heading when no auth.
// Assumes aircraft is mid-flight — projects ~750 km backward (dep) and forward (arr).
function inferRoute(lat: number, lng: number, headingDeg: number, speedMs: number): {
  departure: FlightAirport | null
  arrival:   FlightAirport | null
} {
  const cruiseKmh = speedMs > 0 ? speedMs * 3.6 : 850
  const estDistKm = Math.min(cruiseKmh * 1.0, 1500) // assume ~1h flight segment

  const backHeading = (headingDeg + 180) % 360
  const [depLat, depLng] = project(lat, lng, backHeading, estDistKm)
  const [arrLat, arrLng] = project(lat, lng, headingDeg,  estDistKm)

  const departure = nearestAirport(depLat, depLng)
  const arrival   = nearestAirport(arrLat, arrLng, departure?.icao)

  return { departure, arrival }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { icao24: string } }
): Promise<NextResponse> {
  const icao24 = params.icao24.toLowerCase()
  const sp     = req.nextUrl.searchParams

  const lat     = parseFloat(sp.get('lat')     ?? '')
  const lng     = parseFloat(sp.get('lng')     ?? '')
  const heading = parseFloat(sp.get('heading') ?? '')
  const speed   = parseFloat(sp.get('speed')   ?? '')

  const [meta, flight] = await Promise.all([
    fetchMeta(icao24),
    fetchFlight(icao24),
  ])

  let departure = lookupAirport(flight.departureAirport ?? '')
  let arrival   = lookupAirport(flight.arrivalAirport   ?? '')

  // Fall back to heading-based inference when no auth or ICAO not in local db
  if (!departure && !arrival && !isNaN(lat) && !isNaN(lng) && !isNaN(heading)) {
    const inferred = inferRoute(lat, lng, heading, isNaN(speed) ? 0 : speed)
    departure = inferred.departure
    arrival   = inferred.arrival
  }

  const route: FlightRoute = {
    departure,
    arrival,
    aircraftType: meta.typecode,
    model:        meta.model,
    registration: meta.registration,
    operator:     meta.operator,
  }

  return NextResponse.json(route, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
