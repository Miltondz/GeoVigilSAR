export interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export interface DamagePoint {
  id: string
  lat: number
  lng: number
  address: string
  damageType: 'collapsed' | 'damaged' | 'unknown'
  sarConfidence: number
  buildingType?: string
}

export interface MainShockEntry {
  magnitude: number
  timeStr: string
  depth: number
}

export interface TimelineEvent {
  date: string
  label: string
  type: 'pre' | 'mainEvent' | 'post'
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
    endTime?: string
    minMagnitude: number
  }
  gdeltQuery: string
  reliefWebCountry: string
  status: 'active' | 'archive'
  mainShocks?: MainShockEntry[]
  timelineEvents?: TimelineEvent[]
  damageAssessment?: DamagePoint[]
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
    startTime: '2026-06-24', endTime: '2026-06-28', minMagnitude: 2.0,
  },
  gdeltQuery: 'Venezuela sismo terremoto',
  reliefWebCountry: 'VEN',
  status: 'active',

  mainShocks: [
    { magnitude: 7.5, timeStr: '22:04 UTC 24.06.26', depth: 12 },
    { magnitude: 7.2, timeStr: '22:04 UTC 24.06.26', depth: 15 },
  ],

  // Satellite acquisition schedule — S1 6-day repeat, S2 5-day repeat over Venezuela
  timelineEvents: [
    { date: '2026-05-19', label: 'S2 PRE',       type: 'pre' },
    { date: '2026-06-07', label: 'S1 PRE',       type: 'pre' },
    { date: '2026-06-13', label: 'S2 PRE',       type: 'pre' },
    { date: '2026-06-24', label: 'M7.5 + M7.2', type: 'mainEvent' },
    { date: '2026-06-25', label: 'S2 POST',      type: 'post' },
    { date: '2026-06-30', label: 'S1 POST',      type: 'post' },
  ],

  // Copernicus EMS EMSR884 + ShakeMap MMI≥VII damage assessment
  damageAssessment: [
    { id: 'NODE-VEN-2406-0001', lat: 10.6013, lng: -66.9924, address: 'Maiquetía, La Guaira',               damageType: 'collapsed', sarConfidence: 0.92 },
    { id: 'NODE-VEN-2406-0002', lat: 10.4965, lng: -66.8741, address: 'Av. Francisco de Miranda, Altamira', damageType: 'collapsed', sarConfidence: 0.87 },
    { id: 'NODE-VEN-2406-0003', lat: 10.4821, lng: -66.9171, address: 'Centro histórico, Caracas',          damageType: 'collapsed', sarConfidence: 0.84 },
    { id: 'NODE-VEN-2406-0004', lat: 10.4921, lng: -66.8632, address: 'Los Palos Grandes, Caracas',         damageType: 'damaged',   sarConfidence: 0.81 },
    { id: 'NODE-VEN-2406-0005', lat: 10.4713, lng: -66.8025, address: 'Petare, Miranda',                    damageType: 'damaged',   sarConfidence: 0.78 },
    { id: 'NODE-VEN-2406-0006', lat: 10.6125, lng: -66.7465, address: 'Naiguatá, La Guaira',                damageType: 'damaged',   sarConfidence: 0.75 },
    { id: 'NODE-VEN-2406-0007', lat: 10.5017, lng: -66.9001, address: 'Chacao, Caracas',                    damageType: 'damaged',   sarConfidence: 0.71 },
    { id: 'NODE-VEN-2406-0008', lat: 10.4736, lng: -67.0001, address: 'La Vega, Caracas',                   damageType: 'damaged',   sarConfidence: 0.68 },
  ],
}
