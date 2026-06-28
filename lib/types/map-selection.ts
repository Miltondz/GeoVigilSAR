export type SelectedMapObject =
  | {
      type: 'earthquake'
      id: string
      magnitude: number
      depth: number
      lat: number
      lng: number
      time: number
      place: string
      classification: string
    }
  | {
      type: 'damage'
      id: string
      lat: number
      lng: number
      address: string
      damageType: 'collapsed' | 'damaged' | 'unknown'
      sarConfidence: number
      buildingType?: string
    }
  | {
      type: 'satellite'
      noradId: number
      name: string
      lat: number
      lng: number
      altitudeKm: number
      orbitClass: string
      nextCaptureWindow: { startMs: number; endMs: number; maxElevationDeg: number } | null
    }
