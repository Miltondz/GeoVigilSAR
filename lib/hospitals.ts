import hospitalsData from '@/data/hospitals-venezuela.json'

export interface Hospital {
  osmId: string
  name: string
  lat: number
  lng: number
  status: 'GREEN' | 'AMBER' | 'RED'
  capacity?: number
  source: 'osm' | 'ocha' | 'gdelt' | 'manual'
  updatedMs: number
}

// Casts the static JSON import to typed Hospital array
export function loadHospitals(): Hospital[] {
  return hospitalsData as Hospital[]
}

// Haversine distance in km between two lat/lng points
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Returns nearest operational hospital (status !== "RED") and distance in km.
// Returns null if no operational hospitals exist.
export function nearestOperationalHospital(
  lat: number,
  lng: number
): { distanceKm: number; hospital: Hospital } | null {
  const hospitals = loadHospitals().filter(h => h.status !== 'RED')
  if (hospitals.length === 0) return null

  let best: Hospital = hospitals[0]
  let bestDist = haversineKm(lat, lng, best.lat, best.lng)

  for (let i = 1; i < hospitals.length; i++) {
    const d = haversineKm(lat, lng, hospitals[i].lat, hospitals[i].lng)
    if (d < bestDist) {
      bestDist = d
      best = hospitals[i]
    }
  }

  return { distanceKm: bestDist, hospital: best }
}
