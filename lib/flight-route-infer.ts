// Client-safe (no Node.js) heading-based flight route inference.
// Projects aircraft position backward + forward ~1h of flight to find
// the nearest airports from the static database.

import { AIRPORTS } from './airports'
import type { FlightAirport } from './airports'
import type { AircraftState } from './opensky'

function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function project(lat: number, lng: number, bearingDeg: number, dKm: number): [number, number] {
  const R  = 6371
  const dr = dKm / R
  const b  = bearingDeg * Math.PI / 180
  const φ1 = lat * Math.PI / 180
  const λ1 = lng * Math.PI / 180
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(dr) + Math.cos(φ1) * Math.sin(dr) * Math.cos(b))
  const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(dr) * Math.cos(φ1), Math.cos(dr) - Math.sin(φ1) * Math.sin(φ2))
  return [φ2 * 180 / Math.PI, λ2 * 180 / Math.PI]
}

function nearestAirport(lat: number, lng: number, excludeIcao?: string): FlightAirport | null {
  let best: FlightAirport | null = null
  let bestDist = Infinity
  for (const ap of AIRPORTS) {
    if (excludeIcao && ap.icao === excludeIcao) continue
    const d = distKm(lat, lng, ap.lat, ap.lng)
    if (d < bestDist) { bestDist = d; best = ap }
  }
  return best
}

export interface InferredRoute {
  departure: FlightAirport | null
  arrival:   FlightAirport | null
}

export function inferFlightRoute(ac: AircraftState): InferredRoute {
  if (ac.onGround || ac.longitude == null || ac.latitude == null || ac.heading == null) {
    return { departure: null, arrival: null }
  }

  const speedKmh = (ac.velocity ?? 230) * 3.6  // m/s → km/h
  const estDistKm = Math.min(speedKmh * 1.0, 1500)  // ~1h flight segment, cap 1500km

  const backBearing = (ac.heading + 180) % 360
  const [depLat, depLng] = project(ac.latitude, ac.longitude, backBearing, estDistKm)
  const [arrLat, arrLng] = project(ac.latitude, ac.longitude, ac.heading,  estDistKm)

  const departure = nearestAirport(depLat, depLng)
  const arrival   = nearestAirport(arrLat, arrLng, departure?.icao)

  // Skip if inference gives same airport for both ends
  if (departure?.icao === arrival?.icao) return { departure: null, arrival: null }

  return { departure, arrival }
}
