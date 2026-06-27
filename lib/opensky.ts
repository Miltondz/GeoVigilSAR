// OpenSky Network REST API client — server-side only
// Endpoint: https://opensky-network.org/api/states/all
// Anonymous: 400 credits/day | With OPENSKY_CLIENT_ID+SECRET: 4000 credits/day

export type EmitterCategory =
  | 'NO_INFO'
  | 'LIGHT'
  | 'SMALL'
  | 'LARGE'
  | 'HIGH_VORTEX'
  | 'HEAVY'
  | 'HIGH_PERF'
  | 'ROTORCRAFT'
  | 'GLIDER'
  | 'LIGHTER_AIR'
  | 'PARACHUTE'
  | 'ULTRALIGHT'
  | 'UAV'
  | 'SPACE'
  | 'EMERGENCY_VEHICLE'
  | 'SERVICE_VEHICLE'
  | 'UNKNOWN'

export interface AircraftState {
  icao24: string
  callsign: string | null
  originCountry: string
  longitude: number | null
  latitude: number | null
  baroAltitude: number | null  // metres
  velocity: number | null      // m/s
  verticalRate: number | null  // m/s (positive = ascending)
  heading: number | null       // degrees 0-360
  onGround: boolean
  category: EmitterCategory
  lastContact: number          // epoch seconds
}

// OpenSky column indices (state vector array)
// 0:icao24, 1:callsign, 2:origin_country, 3:time_position, 4:last_contact,
// 5:longitude, 6:latitude, 7:baro_altitude, 8:on_ground, 9:velocity,
// 10:true_track (heading), 11:vertical_rate, 12:sensors, 13:geo_altitude,
// 14:squawk, 15:spi, 16:position_source, 17:category (optional)

const CATEGORY_MAP: Record<number, EmitterCategory> = {
  0:  'NO_INFO',
  1:  'NO_INFO',
  2:  'LIGHT',
  3:  'SMALL',
  4:  'LARGE',
  5:  'HIGH_VORTEX',
  6:  'HEAVY',
  7:  'HIGH_PERF',
  8:  'ROTORCRAFT',
  9:  'GLIDER',
  10: 'LIGHTER_AIR',
  11: 'PARACHUTE',
  12: 'ULTRALIGHT',
  13: 'UAV',
  14: 'SPACE',
  15: 'EMERGENCY_VEHICLE',
  16: 'SERVICE_VEHICLE',
  17: 'UNKNOWN',
}

function mapCategory(raw: unknown): EmitterCategory {
  if (typeof raw === 'number' && raw in CATEGORY_MAP) {
    return CATEGORY_MAP[raw]
  }
  return 'UNKNOWN'
}

function parseState(row: unknown[]): AircraftState | null {
  if (!Array.isArray(row) || row.length < 17) return null

  const icao24 = typeof row[0] === 'string' ? row[0] : null
  if (!icao24) return null

  const longitude = typeof row[5] === 'number' ? row[5] : null
  const latitude  = typeof row[6] === 'number' ? row[6] : null

  // Filter out aircraft with missing position
  if (longitude === null || latitude === null) return null

  // Enforce Venezuela bbox
  if (latitude < 0 || latitude > 13 || longitude < -74 || longitude > -59) return null

  return {
    icao24,
    callsign:      typeof row[1] === 'string' ? row[1].trim() || null : null,
    originCountry: typeof row[2] === 'string' ? row[2] : '',
    longitude,
    latitude,
    baroAltitude:  typeof row[7] === 'number' ? row[7] : null,
    velocity:      typeof row[9] === 'number' ? row[9] : null,
    heading:       typeof row[10] === 'number' ? row[10] : null,
    verticalRate:  typeof row[11] === 'number' ? row[11] : null,
    onGround:      typeof row[8] === 'boolean' ? row[8] : false,
    category:      mapCategory(row[17]),
    lastContact:   typeof row[4] === 'number' ? row[4] : 0,
  }
}

interface OpenSkyResponse {
  time: number
  states: unknown[][] | null
}

export async function fetchVenezuelaTraffic(): Promise<AircraftState[]> {
  // Venezuela bbox (VEN-2406)
  const params = new URLSearchParams({
    lamin: '0',
    lomin: '-74',
    lamax: '13',
    lomax: '-59',
  })

  const url = `https://opensky-network.org/api/states/all?${params.toString()}`

  const headers: Record<string, string> = {}
  const clientId     = process.env.OPENSKY_CLIENT_ID
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET
  if (clientId && clientSecret) {
    const token = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    headers['Authorization'] = `Basic ${token}`
  }

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      // 429 = rate limit, 403 = auth issue — degrade silently
      return []
    }

    const data = (await res.json()) as OpenSkyResponse

    if (!data.states || !Array.isArray(data.states)) return []

    const aircraft: AircraftState[] = []
    for (const row of data.states) {
      const state = parseState(row)
      if (state) aircraft.push(state)
    }
    return aircraft
  } catch {
    // Network error, JSON parse error — degrade gracefully
    return []
  }
}
