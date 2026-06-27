export interface FirmsFire {
  lat: number
  lng: number
  frp: number
  brightness: number
  confidence: number
  acqDate: string
  acqTime: string
  satellite: string
  daynight: 'D' | 'N'
  instrument: 'MODIS' | 'VIIRS'
}

export function normalizeConfidence(raw: string, instrument: 'MODIS' | 'VIIRS'): number {
  if (instrument === 'VIIRS') {
    if (raw === 'high') return 90
    if (raw === 'nominal') return 65
    return 25
  }
  return Math.min(100, Math.max(0, parseFloat(raw) || 0))
}
