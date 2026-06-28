// GET /api/aircraft/[icao24]
// Enriches an aircraft with type, registration, and flight route data.
// Tries OpenSky metadata + flight-history APIs if credentials are set.
// Always returns a valid JSON response — external failures degrade to nulls.

import { type NextRequest, NextResponse } from 'next/server'
import { lookupAirport } from '@/lib/airports'
import type { FlightRoute } from '@/lib/airports'

export const runtime  = 'nodejs'
export const revalidate = 300  // 5 min cache — type/reg info is stable

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

    const modelStr = [d.manufacturername, d.model].filter(Boolean).join(' ') || null

    return {
      typecode:     d.typecode ?? d.icaotypecode ?? null,
      model:        modelStr,
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
  const begin = end - 86400  // last 24h

  try {
    const res = await fetch(
      `https://opensky-network.org/api/flights/aircraft?icao24=${icao24}&begin=${begin}&end=${end}`,
      { headers, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return { departureAirport: null, arrivalAirport: null }

    const flights = await res.json() as Array<{
      firstSeen:            number
      lastSeen:             number
      estDepartureAirport:  string | null
      estArrivalAirport:    string | null
    }>

    if (!Array.isArray(flights) || flights.length === 0) {
      return { departureAirport: null, arrivalAirport: null }
    }

    // Most recent flight (highest firstSeen)
    const latest = flights.reduce((a, b) => (a.firstSeen > b.firstSeen ? a : b))

    return {
      departureAirport: latest.estDepartureAirport ?? null,
      arrivalAirport:   latest.estArrivalAirport   ?? null,
    }
  } catch {
    return { departureAirport: null, arrivalAirport: null }
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { icao24: string } }
): Promise<NextResponse> {
  const icao24 = params.icao24.toLowerCase()

  const [meta, flight] = await Promise.all([
    fetchMeta(icao24),
    fetchFlight(icao24),
  ])

  const route: FlightRoute = {
    departure:    lookupAirport(flight.departureAirport ?? ''),
    arrival:      lookupAirport(flight.arrivalAirport   ?? ''),
    aircraftType: meta.typecode,
    model:        meta.model,
    registration: meta.registration,
    operator:     meta.operator,
  }

  return NextResponse.json(route, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
