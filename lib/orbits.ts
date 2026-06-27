/**
 * lib/orbits.ts
 * Orbital mechanics using satellite.js v7 (SGP4/SDP4).
 * Server-safe — no browser APIs.
 */
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  radiansToDegrees,
  degreesToRadians,
  eciToEcf,
  ecfToLookAngles,
  type EciVec3,
} from 'satellite.js'

// ── Exported interfaces ──────────────────────────────────────────────────────

export interface TLE {
  name: string
  line1: string
  line2: string
  noradId: number
}

export type OrbitClass = 'LEO' | 'MEO' | 'GEO' | 'GEOSYNC' | 'HEO'

export interface GroundTrackPoint {
  lat: number
  lng: number
  t: number // ms epoch
}

export interface CaptureWindow {
  startMs: number
  endMs: number
  maxElevationDeg: number
}

export interface SatellitePass {
  noradId: number
  name: string
  tleLine1: string
  tleLine2: string
  orbitClass: OrbitClass
  isGeostationary: boolean
  currentPosition: { lat: number; lng: number; altitudeKm: number } | null
  nextCaptureWindow: CaptureWindow | null
  groundTrack: GroundTrackPoint[] // next ~200 min
}

// ── Constants ────────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6378.137
const GEO_ALT_KM = 35786

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Great-circle distance between two lat/lng points (km). */
function gcDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = EARTH_RADIUS_KM
  const φ1 = degreesToRadians(lat1)
  const φ2 = degreesToRadians(lat2)
  const Δφ = degreesToRadians(lat2 - lat1)
  const Δλ = degreesToRadians(lng2 - lng1)
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Public functions ─────────────────────────────────────────────────────────

/**
 * Classify orbit by altitude and eccentricity derived from TLE.
 * Uses satrec.altp / alta (Earth-radii above surface).
 */
export function classifyOrbit(tle: TLE): {
  orbitClass: OrbitClass
  isGeostationary: boolean
} {
  const satrec = twoline2satrec(tle.line1, tle.line2)
  // altp / alta are perigee / apogee altitudes in Earth radii above surface
  const perigeeKm = satrec.altp * EARTH_RADIUS_KM
  const apogeeKm = satrec.alta * EARTH_RADIUS_KM
  const meanAltKm = (perigeeKm + apogeeKm) / 2
  const ecco = satrec.ecco

  if (ecco > 0.25) return { orbitClass: 'HEO', isGeostationary: false }
  if (Math.abs(meanAltKm - GEO_ALT_KM) < 200)
    return { orbitClass: 'GEO', isGeostationary: true }
  if (Math.abs(meanAltKm - GEO_ALT_KM) < 2000)
    return { orbitClass: 'GEOSYNC', isGeostationary: false }
  if (meanAltKm < 2000) return { orbitClass: 'LEO', isGeostationary: false }
  return { orbitClass: 'MEO', isGeostationary: false }
}

/**
 * Propagate current (or given) satellite position to geodetic coords.
 * Returns null if propagation fails (decay, out-of-range TLE, etc.).
 */
export function currentPosition(
  tle: TLE,
  atMs?: number,
): { lat: number; lng: number; altitudeKm: number } | null {
  const satrec = twoline2satrec(tle.line1, tle.line2)
  const date = new Date(atMs ?? Date.now())
  const posVel = propagate(satrec, date)
  if (!posVel?.position) return null

  const gmst = gstime(date)
  const geo = eciToGeodetic(posVel.position as EciVec3<number>, gmst)
  return {
    lat: radiansToDegrees(geo.latitude),
    lng: radiansToDegrees(geo.longitude),
    altitudeKm: geo.height,
  }
}

/**
 * Generate ground track: one point every stepS seconds from fromMs to toMs.
 * Default: next 200 minutes at 60-second resolution → ~200 points.
 */
export function groundTrack(
  tle: TLE,
  fromMs: number,
  toMs: number,
  stepS = 60,
): GroundTrackPoint[] {
  const satrec = twoline2satrec(tle.line1, tle.line2)
  const points: GroundTrackPoint[] = []
  const stepMs = stepS * 1000

  for (let t = fromMs; t <= toMs; t += stepMs) {
    const date = new Date(t)
    const posVel = propagate(satrec, date)
    if (!posVel?.position) continue

    const gmst = gstime(date)
    const geo = eciToGeodetic(posVel.position as EciVec3<number>, gmst)
    points.push({
      lat: radiansToDegrees(geo.latitude),
      lng: radiansToDegrees(geo.longitude),
      t,
    })
  }

  return points
}

/**
 * Find next window where the satellite passes within SAR imaging range
 * of `target` (< RANGE_KM ground-track distance).
 *
 * Uses ecfToLookAngles for accurate maxElevationDeg.
 * Returns null if no pass found within maxLookaheadH hours.
 */
export function nextCaptureWindow(
  tle: TLE,
  target: { lat: number; lng: number },
  maxLookaheadH = 24,
): CaptureWindow | null {
  const satrec = twoline2satrec(tle.line1, tle.line2)
  const nowMs = Date.now()
  const endMs = nowMs + maxLookaheadH * 3600 * 1000
  const stepMs = 30 * 1000 // 30-second steps
  const RANGE_KM = 300 // SAR swath half-width approximation

  // Target geodetic (for ecfToLookAngles)
  const targetGeodetic = {
    latitude: degreesToRadians(target.lat),
    longitude: degreesToRadians(target.lng),
    height: 0,
  }

  let windowStart: number | null = null
  let windowEnd: number | null = null
  let maxElev = 0

  for (let t = nowMs; t <= endMs; t += stepMs) {
    const date = new Date(t)
    const posVel = propagate(satrec, date)
    if (!posVel?.position) continue

    const gmst = gstime(date)
    const pos = posVel.position as EciVec3<number>
    const geo = eciToGeodetic(pos, gmst)
    const satLat = radiansToDegrees(geo.latitude)
    const satLng = radiansToDegrees(geo.longitude)

    const dist = gcDistanceKm(satLat, satLng, target.lat, target.lng)

    if (dist < RANGE_KM) {
      if (windowStart === null) windowStart = t
      windowEnd = t

      // Compute elevation angle via ecfToLookAngles
      const satEcf = eciToEcf(pos, gmst)
      const look = ecfToLookAngles(targetGeodetic, satEcf)
      const elevDeg = radiansToDegrees(look.elevation)

      // Sanity-check: ecfToLookAngles can return negative for below-horizon
      // We only call this when dist < RANGE_KM, so elevation should be > 0
      const clampedElev = Math.max(0, elevDeg)
      if (clampedElev > maxElev) maxElev = clampedElev
    } else if (windowStart !== null) {
      // Window ended — return the first one found
      break
    }
  }

  if (windowStart === null || windowEnd === null) return null

  return {
    startMs: windowStart,
    endMs: windowEnd,
    maxElevationDeg: maxElev,
  }
}

/**
 * Assemble a complete SatellitePass for the given TLE and target location.
 */
export function buildSatellitePass(
  tle: TLE,
  target: { lat: number; lng: number },
): SatellitePass {
  const nowMs = Date.now()
  const { orbitClass, isGeostationary } = classifyOrbit(tle)
  const pos = currentPosition(tle)
  const track = groundTrack(tle, nowMs, nowMs + 200 * 60 * 1000)
  const captureWindow = nextCaptureWindow(tle, target)

  return {
    noradId: tle.noradId,
    name: tle.name,
    tleLine1: tle.line1,
    tleLine2: tle.line2,
    orbitClass,
    isGeostationary,
    currentPosition: pos,
    nextCaptureWindow: captureWindow,
    groundTrack: track,
  }
}
