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
      type: 'aircraft'
      icao24: string
      callsign: string
      lat: number
      lng: number
      baroAltitude: number | null
      velocity: number | null
      heading: number | null
      verticalRate: number | null
      onGround: boolean
      originCountry: string
      category: string
      lastContact: number
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
