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
  | {
      type: 'airport'
      iata: string
      icao: string
      name: string
      country: string
      lat: number
      lng: number
    }
  | {
      type: 'weather'
      lat: number
      lng: number
      temp: number
      windSpeed: number
      windDir: number
      windGusts: number
      precip: number
      cloudCover: number
      weatherCode: number
      visibility: number | null
    }
  | {
      type: 'buoy'
      id: string
      lat: number
      lng: number
      waveHeight: number | null
      seaTemp: number | null
      windSpeed: number | null
      airTemp: number | null
      pressure: number | null
    }
  | {
      type: 'osm'
      id: number
      kind: 'shelter' | 'school' | 'hospital' | 'fuel' | 'police' | 'fire_station' | 'bridge' | 'helipad'
      name: string
      lat: number
      lng: number
      tags: Record<string, string>
    }
  | {
      type: 'admin'
      name: string
      pcode: string
      population: number
      lat: number
      lng: number
    }
  | {
      type: 'usaid'
      id: string
      country: string
      disasterType: string
      declarationDate: string
      status: string
      fundingUsd: number | null
      description: string
      lat: number
      lng: number
    }
  | {
      type: 'funding'
      organization: string
      totalUsd: number
      lat: number
      lng: number
    }
