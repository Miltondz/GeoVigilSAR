import type { EventConfig } from './ven-2406'

export const TUR_2302: EventConfig = {
  id: 'TUR-2302',
  name: { es: 'Turquía 2023', en: 'Turkey 2023' },
  mainShockTime: 1675685940000, // 2023-02-06T01:17:00Z — Mw 7.8
  mainShockMagnitude: 7.8,
  epicenter: { lat: 37.17, lng: 37.09 }, // Kahramanmaraş
  bbox: { minLat: 35, maxLat: 40, minLng: 34, maxLng: 42 },
  initialZoom: 7,
  faultSystem: 'East Anatolian Fault',
  affectedStates: ['Kahramanmaraş', 'Gaziantep', 'Hatay', 'Malatya', 'Adana', 'Adıyaman'],
  usgsQuery: {
    minLat: 35, maxLat: 40, minLng: 34, maxLng: 42,
    startTime: '2023-02-06', minMagnitude: 2.0,
  },
  gdeltQuery: 'Turkey earthquake Kahramanmaras Gaziantep',
  reliefWebCountry: 'TUR',
  status: 'archive',
}
