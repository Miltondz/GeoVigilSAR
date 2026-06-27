export interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export interface EventConfig {
  id: string
  name: { es: string; en: string }
  mainShockTime: number
  mainShockMagnitude: number
  epicenter: { lat: number; lng: number }
  bbox: BoundingBox
  initialZoom: number
  faultSystem: string
  affectedStates: string[]
  usgsQuery: {
    minLat: number; maxLat: number
    minLng: number; maxLng: number
    startTime: string
    minMagnitude: number
  }
  gdeltQuery: string
  reliefWebCountry: string
  status: 'active' | 'archive'
}

export const VEN_2406: EventConfig = {
  id: 'VEN-2406',
  name: { es: 'Venezuela 2026', en: 'Venezuela 2026' },
  mainShockTime: 1750806240000,
  mainShockMagnitude: 7.5,
  epicenter: { lat: 10.4, lng: -68.7 },
  bbox: { minLat: 0, maxLat: 13, minLng: -74, maxLng: -59 },
  initialZoom: 7,
  faultSystem: 'Boconó-Morón-El Pilar',
  affectedStates: ['La Guaira', 'Miranda', 'Aragua', 'Carabobo', 'Yaracuy', 'Trujillo'],
  usgsQuery: {
    minLat: 0, maxLat: 13, minLng: -74, maxLng: -59,
    startTime: '2026-06-24', minMagnitude: 2.0,
  },
  gdeltQuery: 'Venezuela sismo terremoto',
  reliefWebCountry: 'VEN',
  status: 'active',
}
