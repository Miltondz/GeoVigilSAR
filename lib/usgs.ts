export interface USGSFeature {
  id: string
  magnitude: number
  depth: number
  lat: number
  lng: number
  time: number
  place: string
  type: 'earthquake' | 'quarry blast' | 'explosion' | string
  status: string
  tsunamiWarning: boolean
  sig: number
}

interface USGSResponse {
  type: string
  features: {
    id: string
    properties: {
      mag: number
      place: string
      time: number
      updated: number
      type: string
      status: string
      tsunami: number
      sig: number
    }
    geometry: { coordinates: [number, number, number] }
  }[]
}

export interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export async function fetchUSGSEarthquakes(
  bbox: BoundingBox,
  {
    startTime,
    endTime,
    minMagnitude = 2.0,
    limit = 500,
  }: { startTime?: string; endTime?: string; minMagnitude?: number; limit?: number } = {}
): Promise<USGSFeature[]> {
  const params = new URLSearchParams({
    format: 'geojson',
    minlatitude: bbox.minLat.toString(),
    maxlatitude: bbox.maxLat.toString(),
    minlongitude: bbox.minLng.toString(),
    maxlongitude: bbox.maxLng.toString(),
    minmagnitude: minMagnitude.toString(),
    orderby: 'time',
    limit: limit.toString(),
  })
  if (startTime) params.set('starttime', startTime)
  if (endTime)   params.set('endtime', endTime)

  const res = await fetch(
    `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`,
    { next: { revalidate: 60 }, signal: AbortSignal.timeout(10_000) }
  )
  if (!res.ok) throw new Error(`USGS API ${res.status}`)

  const data: USGSResponse = await res.json()

  return data.features.map(f => ({
    id: f.id,
    magnitude: f.properties.mag,
    depth: f.geometry.coordinates[2],
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    time: f.properties.time,
    place: f.properties.place,
    type: f.properties.type,
    status: f.properties.status,
    tsunamiWarning: f.properties.tsunami === 1,
    sig: f.properties.sig,
  }))
}

export function classifyEarthquake(
  feature: USGSFeature,
  mainShockTime: number,
  mainShockMag: number
): 'mainshock' | 'foreshock' | 'aftershock' | 'earthquake' {
  const DAY_MS = 86400000
  if (Math.abs(feature.time - mainShockTime) < 60000 && feature.magnitude >= mainShockMag - 0.5) {
    return 'mainshock'
  }
  if (feature.time < mainShockTime && feature.time > mainShockTime - DAY_MS) return 'foreshock'
  if (feature.time > mainShockTime) return 'aftershock'
  return 'earthquake'
}
