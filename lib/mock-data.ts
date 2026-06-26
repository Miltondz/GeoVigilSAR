export const MOCK_STATS = {
  fatalities: 235,
  injured: 4300,
  aftershockCount: 138,
  lastAftershock: { magnitude: 4.0, place: 'La Guaira', hoursAgo: 4 },
  rescuedAlive: 47,
  displaced: 12400,
}

export const MOCK_MAIN_SHOCKS = [
  { magnitude: 7.5, timeStr: '22:04 UTC 24.06.26', depth: 12 },
  { magnitude: 7.2, timeStr: '22:04 UTC 24.06.26', depth: 15 },
]

export const MOCK_DATA_STREAM: { time: string; text: string; type: 'seismic' | 'news' | 'system' }[] = [
  { time: '14:52 UTC', text: 'M2.8 detected · Yaracuy', type: 'seismic' },
  { time: '14:47 UTC', text: 'OCHA: 47 rescatados vivos en Altamira', type: 'news' },
  { time: '14:39 UTC', text: 'M2.3 detected · La Guaira', type: 'seismic' },
  { time: '14:31 UTC', text: 'Reuters: colapso edificio Av. Miranda confirmado', type: 'news' },
  { time: '14:23 UTC', text: 'M3.1 detected · Miranda', type: 'seismic' },
  { time: '14:15 UTC', text: 'USGS ShakeMap actualizado', type: 'system' },
  { time: '14:09 UTC', text: 'M2.1 detected · La Guaira', type: 'seismic' },
  { time: '14:01 UTC', text: 'ReliefWeb: nuevo reporte OCHA ingested', type: 'system' },
  { time: '13:52 UTC', text: 'M2.6 detected · Aragua', type: 'seismic' },
  { time: '13:44 UTC', text: 'El Nacional: aeropuerto sin vuelos', type: 'news' },
]

export const MOCK_NEWS = [
  { title: 'Venezuela earthquake: rescue teams reach Altamira building collapse', source: 'Reuters', timeStr: 'hace 23 min', url: '#', lang: 'en' },
  { title: 'OCHA: Más de 12,000 personas desplazadas en La Guaira', source: 'ReliefWeb', timeStr: 'hace 41 min', url: '#', lang: 'es' },
  { title: 'Réplica M4.0 sacude La Guaira tras el sismo principal', source: 'El Nacional', timeStr: 'hace 1h 12m', url: '#', lang: 'es' },
  { title: 'Copernicus EMS activado para Venezuela — evaluación en curso', source: 'Copernicus', timeStr: 'hace 2h 3m', url: '#', lang: 'es' },
  { title: 'Venezuela quake: Simón Bolívar airport remains closed', source: 'AP', timeStr: 'hace 2h 31m', url: '#', lang: 'en' },
  { title: 'Gobierno declara La Guaira zona de desastre nacional', source: 'AVN', timeStr: 'hace 3h', url: '#', lang: 'es' },
  { title: 'USGS: Secuencia de réplicas activa, M3+ esperadas próximas 72h', source: 'USGS', timeStr: 'hace 3h 45m', url: '#', lang: 'es' },
]

export const MOCK_DAMAGE_POINTS = [
  { id: 'NODE-VEN-2406-0001', lat: 10.4965, lng: -66.8741, address: 'Av. Francisco de Miranda, Altamira', damageType: 'collapsed' as const, sarConfidence: 0.94 },
  { id: 'NODE-VEN-2406-0002', lat: 10.4921, lng: -66.8632, address: 'Los Palos Grandes, Caracas', damageType: 'collapsed' as const, sarConfidence: 0.87 },
  { id: 'NODE-VEN-2406-0003', lat: 10.6013, lng: -66.9924, address: 'Maiquetía, La Guaira', damageType: 'damaged' as const, sarConfidence: 0.71 },
  { id: 'NODE-VEN-2406-0004', lat: 10.5017, lng: -66.9001, address: 'Chacao, Caracas', damageType: 'damaged' as const, sarConfidence: 0.63 },
]

export const MOCK_TIMELINE_EVENTS = [
  { date: '2026-05-19', label: 'S2 PRE', type: 'pre' as const },
  { date: '2026-06-07', label: 'S1 PRE', type: 'pre' as const },
  { date: '2026-06-13', label: 'S2 PRE', type: 'pre' as const },
  { date: '2026-06-24', label: 'M7.5 + M7.2', type: 'mainEvent' as const },
  { date: '2026-06-25', label: 'S2 POST', type: 'post' as const },
  { date: '2026-06-30', label: 'S1 POST', type: 'post' as const },
]
