// Air traffic provider abstraction
// Allows switching between OpenSky (free) and ADS-B Exchange (future) without
// touching consumers.

import type { AircraftState } from '../opensky'
import { fetchVenezuelaTraffic } from '../opensky'

export type { AircraftState }

export interface AirTrafficProvider {
  id: 'opensky' | 'adsbx'
  fetchTraffic(): Promise<AircraftState[]>
  available(): boolean
}

export const openSkyProvider: AirTrafficProvider = {
  id: 'opensky',
  fetchTraffic: fetchVenezuelaTraffic,
  // Anonymous tier always available (may return [] during low-quota windows)
  available: () => true,
}

// Hook for ADS-B Exchange (not yet implemented — define interface only)
// export const adsbxProvider: AirTrafficProvider = {
//   id: 'adsbx',
//   fetchTraffic: fetchAdsbxTraffic,
//   available: () => !!process.env.ADSBX_API_KEY,
// }

export function getAirTrafficProvider(): AirTrafficProvider {
  return openSkyProvider
}
