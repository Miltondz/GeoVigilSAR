'use client'

import { useEffect, useRef, useState } from 'react'
import type { Viewer as CesiumViewer, Entity as CesiumEntity, Cartesian3 as CesiumCartesian3 } from 'cesium'
import type { DamagePoint } from '@/lib/events/ven-2406'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import type { SatellitePass } from '@/lib/orbits'
import type { AircraftState } from '@/lib/opensky'
import type { FlightRoute } from '@/lib/airports'
import { countryIso2 } from '@/lib/country-flags'
import { inferFlightRoute } from '@/lib/flight-route-infer'
import type { AviationAirport } from '@/lib/aviationstack'
import type { WeatherPoint } from '@/lib/open-meteo'
import { windDirArrow, weatherCodeLabel } from '@/lib/open-meteo'
import type { BuoyObservation } from '@/lib/ndbc'
import type { OsmFeature } from '@/lib/overpass'
import type { AdminBoundary } from '@/lib/hdx'
import type { UsaidDeclaration } from '@/lib/usaid'
import type { FtsFlow } from '@/lib/fts'
import { topDonors, getDonorPosition } from '@/lib/fts'

// Boconó-Morón-El Pilar fault system coordinates [lng, lat, lng, lat, ...]
// Duplicated from FaultLinesLayer to avoid cross-tree imports
const FAULT_SEGMENTS: number[][] = [
  // Falla Boconó
  [-74.0, 7.8, -73.0, 8.2, -72.0, 8.5, -71.0, 9.0,
    -70.0, 9.5, -69.5, 9.8, -68.7, 10.2, -68.0, 10.4],
  // Falla Morón
  [-68.0, 10.4, -67.5, 10.5, -67.0, 10.6, -66.5, 10.6,
    -66.0, 10.7, -65.5, 10.7],
  // Falla El Pilar
  [-65.5, 10.7, -65.0, 10.7, -64.5, 10.6, -64.0, 10.5,
    -63.5, 10.4, -63.0, 10.3, -62.5, 10.2, -61.5, 10.1],
]

const WAVE_PERIOD_S   = 10       // seconds per wave cycle
const WAVE_MAX_RADIUS = 250_000  // metres — realistic felt zone for M7.5
const WAVE_COUNT      = 3        // staggered rings
const IMPACT_RADIUS   = 100_000  // metres

// Declare CESIUM_BASE_URL on window so we can set it before the dynamic import
declare global {
  interface Window {
    CESIUM_BASE_URL: string
  }
}

// Cesium Color equivalents — CSS variables can't be used in a WebGL context.
// Values mirror the project's CSS design tokens exactly.
const C_RED   = '#FF4444'  // --color-red
const C_AMBER = '#FFB800'  // --color-amber
const C_GREEN = '#00FF88'  // --color-green
const C_BG    = '#000A0F'  // --color-bg

export interface EarthquakeMarker {
  id: string
  magnitude: number
  lat: number
  lng: number
  depth: number
  place?: string
  time?: number
}

interface ViewportBbox {
  minLat: number; maxLat: number; minLng: number; maxLng: number
}

interface Cesium3DGlobeProps {
  epicenter: { lat: number; lng: number }
  earthquakes: EarthquakeMarker[]
  visible: boolean
  satellite?: boolean
  activeLayers?: Record<string, boolean>
  damagePoints?: DamagePoint[]
  onSelect?: (obj: SelectedMapObject | null) => void
  onViewportChange?: (bbox: ViewportBbox) => void
  eventId?: string
  flyTo?: { lat: number; lng: number; name?: string } | null
  // Air traffic
  aircraft?: AircraftState[]
  flightRoute?: FlightRoute | null
  selectedAircraftIcao24?: string | null
  // New API layers
  airports?: AviationAirport[]
  weatherPoints?: WeatherPoint[]
  buoys?: BuoyObservation[]
  osmFeatures?: OsmFeature[]
  boundaries?: (AdminBoundary & { population: number | null })[]
  usaidDeclarations?: UsaidDeclaration[]
  ftsFlows?: FtsFlow[]
}

export default function Cesium3DGlobe({
  epicenter,
  earthquakes,
  visible,
  satellite = false,
  activeLayers = {},
  damagePoints = [],
  onSelect,
  onViewportChange,
  eventId = 'VEN-2406',
  flyTo,
  aircraft = [],
  flightRoute,
  selectedAircraftIcao24,
  airports = [],
  weatherPoints = [],
  buoys = [],
  osmFeatures = [],
  boundaries = [],
  usaidDeclarations = [],
  ftsFlows = [],
}: Cesium3DGlobeProps) {
  const containerRef         = useRef<HTMLDivElement>(null)
  const viewerRef            = useRef<CesiumViewer | null>(null)
  const onViewportChangeRef  = useRef(onViewportChange)
  useEffect(() => { onViewportChangeRef.current = onViewportChange }, [onViewportChange])
  const mainshockEntitiesRef  = useRef<CesiumEntity[]>([]) // M≥6.5 mainshock markers
  const aftershockEntitiesRef = useRef<CesiumEntity[]>([]) // M<6.5 aftershock markers
  const entitiesRef           = useRef<CesiumEntity[]>([])  // all earthquake entities (for cleanup)
  const faultEntitiesRef      = useRef<CesiumEntity[]>([])  // fault polylines
  const impactEntitiesRef     = useRef<CesiumEntity[]>([])  // cone + wave pulse
  const damageEntitiesRef     = useRef<CesiumEntity[]>([])  // damage assessment points
  const satelliteEntitiesRef  = useRef<CesiumEntity[]>([])  // satellite bodies + tracks
  const satellitePassesRef    = useRef<SatellitePass[]>([]) // for click handler lookup
  const aircraftEntitiesRef   = useRef<CesiumEntity[]>([])  // 3D aircraft icons + labels
  const routeEntitiesRef      = useRef<CesiumEntity[]>([])  // departure/arrival airport markers
  const aircraftRef           = useRef<AircraftState[]>([]) // live aircraft for click handler
  const airportEntitiesRef    = useRef<CesiumEntity[]>([])
  const weatherEntitiesRef    = useRef<CesiumEntity[]>([])
  const buoyEntitiesRef       = useRef<CesiumEntity[]>([])
  const osmEntitiesRef        = useRef<CesiumEntity[]>([])
  const adminEntitiesRef      = useRef<CesiumEntity[]>([])
  const usaidEntitiesRef      = useRef<CesiumEntity[]>([])
  const fundingEntitiesRef    = useRef<CesiumEntity[]>([])
  const earthquakesRef  = useRef<EarthquakeMarker[]>([])
  const damagePointsRef = useRef<DamagePoint[]>([])
  // Data refs for click handler lookup (entity arrays can't be searched by data)
  const airportsDataRef    = useRef<AviationAirport[]>([])
  const weatherDataRef     = useRef<WeatherPoint[]>([])
  const buoysDataRef       = useRef<BuoyObservation[]>([])
  const osmDataRef         = useRef<OsmFeature[]>([])
  const usaidDataRef       = useRef<UsaidDeclaration[]>([])
  const ftsFlowsDataRef    = useRef<FtsFlow[]>([])
  const onSelectRef     = useRef(onSelect)
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])
  const [cesiumReady, setCesiumReady] = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // ── Init Cesium once on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false

    const init = async () => {
      try {
        // CESIUM_BASE_URL MUST be set before the first Cesium import so that
        // web worker scripts resolve from public/cesium/Workers/.
        window.CESIUM_BASE_URL =
          process.env.NEXT_PUBLIC_CESIUM_BASE_URL ?? '/cesium'

        const CesiumLib = await import('cesium')
        if (cancelled || !containerRef.current) return

        // Suppress Ion token warning — no Ion services are used.
        CesiumLib.Ion.defaultAccessToken =
          process.env.NEXT_PUBLIC_CESIUM_TOKEN ?? ''

        const viewer = new CesiumLib.Viewer(containerRef.current, {
          // CARTO Dark Matter — dark basemap matching HUD theme, no API key needed
          baseLayer: new CesiumLib.ImageryLayer(
            new CesiumLib.UrlTemplateImageryProvider({
              url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              credit: '© OpenStreetMap contributors © CARTO',
              maximumLevel: 19,
            })
          ),
          // EllipsoidTerrainProvider (flat, free) is the Cesium default;
          // omitting terrainProvider uses it automatically.
          animation:            false,
          timeline:             false,
          geocoder:             false,
          homeButton:           false,
          sceneModePicker:      false,
          baseLayerPicker:      false,
          navigationHelpButton: false,
          infoBox:              false,
          selectionIndicator:   false,
          fullscreenButton:     false,
          vrButton:             false,
          skyAtmosphere:        false,
        })

        // Dark background to match HUD theme
        viewer.scene.backgroundColor =
          CesiumLib.Color.fromCssColorString(C_BG)

        // Clock must tick for CallbackProperty animations (ring radius/alpha).
        // animation:false disables the widget but also sets shouldAnimate=false,
        // which freezes currentTime → callbacks cache never invalidates → rings frozen.
        viewer.clock.shouldAnimate = true

        // CRITICAL for animations: the Viewer is created with `animation: false`,
        // so the animation widget never sets `clock.shouldAnimate = true`, leaving
        // it at its default `false`. With shouldAnimate=false the clock is frozen —
        // `clock.currentTime` (the `time` arg passed to every CallbackProperty) never
        // advances, so `time.secondsOfDay` is constant and the per-frame radius/color
        // caches keyed on it never invalidate. Result: pulse rings + wave pulse stay
        // stuck at their initial 1 km radius (effectively invisible) and do not animate.
        // Enabling the clock makes currentTime advance each frame → CallbackProperties
        // re-evaluate → rings expand and fade.
        viewer.clock.shouldAnimate = true

        // Fly to event epicenter at 600 km to show full affected region
        viewer.camera.flyTo({
          destination: CesiumLib.Cartesian3.fromDegrees(epicenter.lng, epicenter.lat, 600_000),
          duration: 0,
        })

        // Click handler — opens MapDetailPanel for earthquakes and damage points
        const handler = new CesiumLib.ScreenSpaceEventHandler(viewer.scene.canvas)
        handler.setInputAction((evt: { position: { x: number; y: number } }) => {
          const pos    = new CesiumLib.Cartesian2(evt.position.x, evt.position.y)
          const picked = viewer.scene.pick(pos)
          if (CesiumLib.defined(picked) && picked.id) {
            const entityId = (picked.id as { id?: string }).id ?? ''

            // Check earthquake entities
            const eq = earthquakesRef.current.find(e => e.id === entityId)
            if (eq) {
              onSelectRef.current?.({
                type: 'earthquake',
                id:             eq.id,
                magnitude:      eq.magnitude,
                depth:          eq.depth,
                lat:            eq.lat,
                lng:            eq.lng,
                time:           eq.time ?? 0,
                place:          eq.place ?? '',
                classification: eq.magnitude >= 6.5 ? 'mainshock' : 'aftershock',
              })
              return
            }

            // Check damage point entities (id = `damage-${pt.id}`)
            if (entityId.startsWith('damage-')) {
              const ptId = entityId.slice(7)
              const pt   = damagePointsRef.current.find(d => d.id === ptId)
              if (pt) {
                onSelectRef.current?.({
                  type: 'damage',
                  id:            pt.id,
                  lat:           pt.lat,
                  lng:           pt.lng,
                  address:       pt.address,
                  damageType:    pt.damageType,
                  sarConfidence: pt.sarConfidence,
                  buildingType:  pt.buildingType,
                })
                return
              }
            }

            // Check satellite entities (id = `satellite-{noradId}`)
            if (entityId.startsWith('satellite-')) {
              const noradId = parseInt(entityId.slice(10), 10)
              const sat = satellitePassesRef.current.find(s => s.noradId === noradId)
              if (sat?.currentPosition) {
                onSelectRef.current?.({
                  type:               'satellite',
                  noradId:            sat.noradId,
                  name:               sat.name,
                  lat:                sat.currentPosition.lat,
                  lng:                sat.currentPosition.lng,
                  altitudeKm:         sat.currentPosition.altitudeKm,
                  orbitClass:         sat.orbitClass,
                  nextCaptureWindow:  sat.nextCaptureWindow,
                })
                return
              }
            }

            // Check 3D aircraft entities (id = `aircraft-3d-{icao24}`)
            if (entityId.startsWith('aircraft-3d-')) {
              const icao24 = entityId.slice(12)
              const ac = aircraftRef.current.find(a => a.icao24 === icao24)
              if (ac == null || ac.longitude == null || ac.latitude == null) return
              onSelectRef.current?.({
                type:         'aircraft',
                icao24:       ac.icao24,
                callsign:     ac.callsign ?? ac.icao24,
                lat:          ac.latitude,
                lng:          ac.longitude,
                baroAltitude: ac.baroAltitude,
                velocity:     ac.velocity,
                heading:      ac.heading,
                verticalRate: ac.verticalRate,
                onGround:     ac.onGround,
                originCountry:ac.originCountry,
                category:     ac.category,
                lastContact:  ac.lastContact,
              })
              return
            }

            // Airport (id = `apt-{iata}`)
            if (entityId.startsWith('apt-')) {
              const code = entityId.slice(4)
              const ap = airportsDataRef.current.find(a =>
                (a.iataCode ?? a.icaoCode ?? a.airportName) === code)
              if (ap) {
                onSelectRef.current?.({
                  type: 'airport', iata: ap.iataCode ?? '', icao: ap.icaoCode ?? '',
                  name: ap.airportName, country: ap.countryName,
                  lat: ap.latitude, lng: ap.longitude,
                })
              }
              return
            }

            // Weather station (id = `wx-{lat}-{lng}`)
            if (entityId.startsWith('wx-')) {
              const wp = weatherDataRef.current.find(w =>
                entityId === `wx-${w.lat.toFixed(3)}-${w.lng.toFixed(3)}`)
              if (wp) {
                onSelectRef.current?.({
                  type: 'weather', lat: wp.lat, lng: wp.lng,
                  temp:        wp.current.temperature2m,
                  windSpeed:   wp.current.windSpeed10m,
                  windDir:     wp.current.windDirection10m,
                  windGusts:   wp.current.windGusts10m,
                  precip:      wp.current.precipitation,
                  cloudCover:  wp.current.cloudCover,
                  weatherCode: wp.current.weatherCode,
                  visibility:  wp.current.visibility,
                })
              }
              return
            }

            // Buoy (id = `buoy-{id}`)
            if (entityId.startsWith('buoy-')) {
              const bid = entityId.slice(5)
              const b = buoysDataRef.current.find(x => x.id === bid)
              if (b) {
                onSelectRef.current?.({
                  type: 'buoy', id: b.id, lat: b.lat, lng: b.lng,
                  waveHeight: b.waveHeight, seaTemp: b.seaTemp,
                  windSpeed: b.windSpeed, airTemp: b.airTemp, pressure: b.pressure,
                })
              }
              return
            }

            // OSM feature (id = `osm-{id}`)
            if (entityId.startsWith('osm-')) {
              const osmId = parseInt(entityId.slice(4), 10)
              const f = osmDataRef.current.find(x => x.id === osmId)
              if (f) {
                onSelectRef.current?.({
                  type: 'osm', id: f.id,
                  // OsmKind is a subset of the panel's kind union — safe cast
                  kind: f.kind as 'shelter' | 'school' | 'hospital' | 'fuel' | 'police' | 'fire_station' | 'bridge' | 'helipad',
                  name: f.name ?? f.kind,
                  lat: f.lat, lng: f.lng, tags: f.tags,
                })
              }
              return
            }

            // USAID disaster (id = `usaid-{id}`)
            if (entityId.startsWith('usaid-')) {
              const uid = entityId.slice(6)
              const d = usaidDataRef.current.find(x => x.id === uid)
              if (d && d.lat != null && d.lng != null) {
                onSelectRef.current?.({
                  type: 'usaid', id: d.id,
                  lat: d.lat as number, lng: d.lng as number,
                  country: d.country, disasterType: d.disasterType,
                  declarationDate: d.declarationDate, status: d.status,
                  fundingUsd: d.fundingUsd, description: d.description,
                })
              }
              return
            }

            // Funding donor node (id = `funding-{org}`)
            if (entityId.startsWith('funding-')) {
              const org = entityId.slice(8)
              const pos = getDonorPosition(org)
              const total = ftsFlowsDataRef.current
                .filter(f => f.sourceOrg === org)
                .reduce((s, f) => s + f.amountUsd, 0)
              onSelectRef.current?.({
                type: 'funding', organization: org,
                totalUsd: total,
                lat: pos?.lat ?? 0, lng: pos?.lng ?? 0,
              })
              return
            }
          }
          onSelectRef.current?.(null)
        }, CesiumLib.ScreenSpaceEventType.LEFT_CLICK)

        viewerRef.current = viewer

        // Emit viewport bbox on camera stop
        const emitCameraViewport = () => {
          if (!onViewportChangeRef.current) return
          const rect = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid)
          if (rect) {
            onViewportChangeRef.current({
              minLat: CesiumLib.Math.toDegrees(rect.south),
              maxLat: CesiumLib.Math.toDegrees(rect.north),
              minLng: CesiumLib.Math.toDegrees(rect.west),
              maxLng: CesiumLib.Math.toDegrees(rect.east),
            })
          }
        }
        viewer.camera.moveEnd.addEventListener(emitCameraViewport)

        if (!cancelled) setCesiumReady(true)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Cesium initialization failed'
          )
        }
      }
    }

    init()

    return () => {
      cancelled = true
      const v = viewerRef.current
      if (v && !v.isDestroyed()) {
        v.destroy()
      }
      viewerRef.current = null
      entitiesRef.current = []
      faultEntitiesRef.current = []
      impactEntitiesRef.current = []
      mainshockEntitiesRef.current = []
      aftershockEntitiesRef.current = []
      damageEntitiesRef.current = []
      satelliteEntitiesRef.current = []
      aircraftEntitiesRef.current = []
      routeEntitiesRef.current = []
      airportEntitiesRef.current = []
      weatherEntitiesRef.current = []
      buoyEntitiesRef.current = []
      osmEntitiesRef.current = []
      adminEntitiesRef.current = []
      usaidEntitiesRef.current = []
      fundingEntitiesRef.current = []
    }
    // epicenter is used only for the initial flyTo — intentionally excluded
    // from deps so Cesium re-initializes only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Add static geometry (fault lines, impact cone, wave pulse) ───────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const addStaticGeometry = async () => {
      const CesiumLib = await import('cesium')
      if (viewer.isDestroyed()) return

      // Clear previous static entities
      for (const ent of [...faultEntitiesRef.current, ...impactEntitiesRef.current]) {
        viewer.entities.remove(ent)
      }
      faultEntitiesRef.current = []
      impactEntitiesRef.current = []

      // Fault polylines — Boconó-Morón-El Pilar
      for (const coords of FAULT_SEGMENTS) {
        const ent = viewer.entities.add({
          show: !!(activeLayers.faults ?? false),
          polyline: {
            positions: CesiumLib.Cartesian3.fromDegreesArray(coords),
            material: new CesiumLib.PolylineGlowMaterialProperty({
              glowPower: 0.25,
              color: CesiumLib.Color.fromCssColorString(C_AMBER),
            }),
            width: 3,
          },
        })
        faultEntitiesRef.current.push(ent)
      }

      // Impact zone — subtle 100 km fill, low alpha so it doesn't dominate
      const coneEnt = viewer.entities.add({
        show: !!(activeLayers.shakemap ?? true),
        position: CesiumLib.Cartesian3.fromDegrees(epicenter.lng, epicenter.lat),
        ellipse: {
          semiMajorAxis: IMPACT_RADIUS,
          semiMinorAxis: IMPACT_RADIUS,
          material: CesiumLib.Color.fromCssColorString(C_RED).withAlpha(0.07),
          height: 0,
        },
      })
      impactEntitiesRef.current.push(coneEnt)

      // Seismic wave rings — WAVE_COUNT staggered pulses expanding from epicenter.
      // Each ring fades in then out as it expands; max alpha kept very low (0.07)
      // so the rings are subtle overlays, not solid fills.
      const waveStart = Date.now()
      const periodMs  = WAVE_PERIOD_S * 1000

      for (let wi = 0; wi < WAVE_COUNT; wi++) {
        const phaseMs = (wi / WAVE_COUNT) * periodMs
        let _r = 1_000, _rt = -1
        let _a = 0,     _at = -1

        const waveRadius = new CesiumLib.CallbackProperty((time?: { secondsOfDay: number }) => {
          if (time && time.secondsOfDay !== _rt) {
            const t = ((Date.now() - waveStart + phaseMs) % periodMs) / periodMs
            _r  = Math.max(1_000, t * WAVE_MAX_RADIUS)
            _rt = time.secondsOfDay
          }
          return _r
        }, false)

        const waveMat = new CesiumLib.CallbackProperty((time?: { secondsOfDay: number }) => {
          if (time && time.secondsOfDay !== _at) {
            const t = ((Date.now() - waveStart + phaseMs) % periodMs) / periodMs
            // Fade in quickly (0→0.1), then fade out (0.1→1) — ring effect
            const env = t < 0.1 ? t / 0.1 : 1 - t
            _a  = Math.max(0, 0.07 * env)
            _at = time.secondsOfDay
          }
          return CesiumLib.Color.fromCssColorString(C_AMBER).withAlpha(_a)
        }, false)

        const waveEnt = viewer.entities.add({
          show: !!(activeLayers.shakemap ?? true),
          position: CesiumLib.Cartesian3.fromDegrees(epicenter.lng, epicenter.lat),
          ellipse: {
            semiMajorAxis: waveRadius,
            semiMinorAxis: waveRadius,
            material: new CesiumLib.ColorMaterialProperty(waveMat),
            height: 0,
          },
        })
        impactEntitiesRef.current.push(waveEnt)
      }
    }

    addStaticGeometry()

    return () => {
      const v = viewerRef.current
      if (v && !v.isDestroyed()) {
        for (const ent of [...faultEntitiesRef.current, ...impactEntitiesRef.current]) {
          v.entities.remove(ent)
        }
      }
      faultEntitiesRef.current = []
      impactEntitiesRef.current = []
    }
    // epicenter values are constant — excluded from deps intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady])

  // Keep refs in sync for click handler lookups
  useEffect(() => { earthquakesRef.current = earthquakes }, [earthquakes])
  useEffect(() => { aircraftRef.current    = aircraft    }, [aircraft])

  // ── Layer visibility toggles ──────────────────────────────────────────────
  useEffect(() => {
    const show = !!(activeLayers.faults ?? false)
    for (const ent of faultEntitiesRef.current) ent.show = show
  }, [activeLayers.faults])

  useEffect(() => {
    const show = !!(activeLayers.shakemap ?? true)
    for (const ent of impactEntitiesRef.current) ent.show = show
  }, [activeLayers.shakemap])

  useEffect(() => {
    const show = !!(activeLayers.epicenters ?? true)
    for (const ent of mainshockEntitiesRef.current) ent.show = show
  }, [activeLayers.epicenters])

  useEffect(() => {
    const show = !!(activeLayers.aftershocks ?? true)
    for (const ent of aftershockEntitiesRef.current) ent.show = show
  }, [activeLayers.aftershocks])

  // ── Satellite + admin boundaries imagery layers ───────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const toggle = async () => {
      const CesiumLib = await import('cesium')
      if (viewer.isDestroyed()) return

      // Remove all layers above index 0 (keep dark CARTO basemap)
      while (viewer.imageryLayers.length > 1) {
        viewer.imageryLayers.remove(viewer.imageryLayers.get(viewer.imageryLayers.length - 1))
      }

      if (satellite) {
        viewer.imageryLayers.addImageryProvider(
          new CesiumLib.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            credit: '© Esri, DigitalGlobe, GeoEye, USDA FSA, USGS',
            maximumLevel: 19,
          })
        )
      }

      // ESRI Reference — transparent overlay with state/city borders + labels
      // Goes on top of both dark and satellite basemaps
      if (activeLayers.adminBoundaries ?? true) {
        viewer.imageryLayers.addImageryProvider(
          new CesiumLib.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            credit: '© Esri',
            maximumLevel: 19,
          })
        )
      }
    }

    toggle()
  }, [cesiumReady, satellite, activeLayers.adminBoundaries])

  // ── Update earthquake markers when data changes ───────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const update = async () => {
      const CesiumLib = await import('cesium') // cached after first load
      if (viewer.isDestroyed()) return

      // Remove previous markers
      for (const ent of entitiesRef.current) viewer.entities.remove(ent)
      entitiesRef.current = []
      mainshockEntitiesRef.current = []
      aftershockEntitiesRef.current = []

      const showMain  = !!(activeLayers.epicenters  ?? true)
      const showAfter = !!(activeLayers.aftershocks ?? true)

      // Ring appearance scaled by magnitude
      // maxRadius = M² * 2500 m  →  M7.5→141km  M5→63km  M3→23km
      // periodMs  = 2500 + M*400  → bigger = slower, more imposing
      // ringCount: M≥6.5=3, M5-6.4=2, M4-4.9=1, M<4=0 (only point)
      function ringParams(mag: number) {
        return {
          ringCount:  mag >= 6.5 ? 3 : mag >= 5 ? 2 : mag >= 4 ? 1 : 0,
          maxRadius:  mag * mag * 2500,
          periodMs:   2500 + mag * 400,
          outlineW:   mag >= 6.5 ? 3 : mag >= 5 ? 2 : 1.5,
        }
      }

      const globalStart = Date.now()

      for (const eq of earthquakes) {
        const isMain = eq.magnitude >= 6.5
        const hex =
          eq.magnitude >= 6.5 ? C_RED :
          eq.magnitude >= 4   ? C_AMBER :
                                C_GREEN
        const color  = CesiumLib.Color.fromCssColorString(hex)
        const show   = isMain ? showMain : showAfter
        const pos    = CesiumLib.Cartesian3.fromDegrees(eq.lng, eq.lat)
        const { ringCount, maxRadius, periodMs, outlineW } = ringParams(eq.magnitude)

        // ── Expanding ring waves ──────────────────────────────────────────
        for (let ri = 0; ri < ringCount; ri++) {
          const phaseMs = (ri / ringCount) * periodMs
          // Per-ring cached radius — shared by both semiMajorAxis and semiMinorAxis
          let _r = 1_000, _rt = -1
          let _c = CesiumLib.Color.fromCssColorString(hex).withAlpha(0.5), _ct = -1

          const ringRadius = new CesiumLib.CallbackProperty((time?: { secondsOfDay: number }) => {
            if (time && time.secondsOfDay !== _rt) {
              const t = ((Date.now() - globalStart + phaseMs) % periodMs) / periodMs
              _r  = Math.max(1_000, t * maxRadius)
              _rt = time.secondsOfDay
            }
            return _r
          }, false)

          const ringColor = new CesiumLib.CallbackProperty((time?: { secondsOfDay: number }) => {
            if (time && time.secondsOfDay !== _ct) {
              const t = ((Date.now() - globalStart + phaseMs) % periodMs) / periodMs
              _c  = CesiumLib.Color.fromCssColorString(hex).withAlpha(Math.max(0, 0.65 * (1 - t)))
              _ct = time.secondsOfDay
            }
            return _c
          }, false)

          const ringEnt = viewer.entities.add({
            show,
            position: pos,
            ellipse: {
              semiMajorAxis: ringRadius,
              semiMinorAxis: ringRadius,
              material:      new CesiumLib.ColorMaterialProperty(ringColor),
              height:        0,
            },
          })
          entitiesRef.current.push(ringEnt)
          if (isMain) mainshockEntitiesRef.current.push(ringEnt)
          else aftershockEntitiesRef.current.push(ringEnt)
        }

        // ── Central point + label (on top of rings) ──────────────────────
        const pointSize = eq.magnitude >= 6.5 ? eq.magnitude * 5 : Math.max(5, eq.magnitude * 3)
        const entity = viewer.entities.add({
          id:   eq.id,
          show,
          position: pos,
          point: {
            pixelSize:    pointSize,
            color,
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 1,
          },
          label: {
            text:         `M${eq.magnitude.toFixed(1)}`,
            font:         `${eq.magnitude >= 5 ? 13 : 10}px monospace`,
            fillColor:    color,
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 2,
            style:        CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset:  new CesiumLib.Cartesian2(0, -22),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            // Only show labels for M≥4 at zoom; smaller ones appear on closer view
            distanceDisplayCondition: new CesiumLib.DistanceDisplayCondition(
              0,
              eq.magnitude >= 5 ? 2_000_000 : eq.magnitude >= 4 ? 800_000 : 300_000
            ),
          },
        })
        entitiesRef.current.push(entity)
        if (isMain) mainshockEntitiesRef.current.push(entity)
        else aftershockEntitiesRef.current.push(entity)
      }
    }

    update()
  }, [earthquakes, cesiumReady, activeLayers.epicenters, activeLayers.aftershocks])

  // ── Damage assessment points ──────────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const render = async () => {
      const CesiumLib = await import('cesium')
      if (viewer.isDestroyed()) return

      for (const ent of damageEntitiesRef.current) viewer.entities.remove(ent)
      damageEntitiesRef.current = []
      damagePointsRef.current   = damagePoints   // keep ref in sync for click handler

      if (!(activeLayers.damagePoints ?? true)) return

      // Build SVG data URLs for building icons (same design as DamagePointsLayer 2D)
      const buildingUrl = (type: 'collapsed' | 'damaged' | 'unknown') => {
        const fill   = type === 'collapsed' ? '#FF4444' : type === 'damaged' ? '#FFB800' : '#607080'
        const stroke = type === 'collapsed' ? '#CC0000' : type === 'damaged' ? '#CC8800' : '#405060'
        const cross  = type === 'collapsed'
          ? `<line x1="4" y1="10" x2="20" y2="24" stroke="${stroke}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
             <line x1="20" y1="10" x2="4" y2="24" stroke="${stroke}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>`
          : ''
        const crack  = type === 'collapsed'
          ? `<line x1="9" y1="12" x2="13" y2="18" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"/>
             <line x1="13" y1="15" x2="17" y2="12" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"/>`
          : type === 'damaged'
          ? `<line x1="11" y1="13" x2="13" y2="19" stroke="${stroke}" stroke-width="1.2" stroke-linecap="round"/>`
          : ''
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28">
          <polygon points="12,1 1,10 23,10" fill="${fill}" opacity="0.95"/>
          <rect x="2" y="10" width="20" height="16" fill="${fill}" opacity="0.9" rx="0.5"/>
          <rect x="4" y="12" width="5" height="4" fill="#000A0F" opacity="0.45" rx="0.5"/>
          <rect x="4" y="18" width="5" height="4" fill="#000A0F" opacity="0.45" rx="0.5"/>
          <rect x="15" y="12" width="5" height="4" fill="#000A0F" opacity="0.45" rx="0.5"/>
          <rect x="15" y="18" width="5" height="4" fill="#000A0F" opacity="0.45" rx="0.5"/>
          <rect x="9" y="21" width="6" height="5" fill="#000A0F" opacity="0.5" rx="0.5"/>
          ${cross}${crack}
          <polygon points="12,1 1,10 23,10" fill="none" stroke="#E0E8F0" stroke-width="0.6" opacity="0.6"/>
          <rect x="2" y="10" width="20" height="16" fill="none" stroke="#E0E8F0" stroke-width="0.6" opacity="0.6" rx="0.5"/>
        </svg>`
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      }

      for (const pt of damagePoints) {
        const hex   = pt.damageType === 'collapsed' ? C_RED : C_AMBER
        const color = CesiumLib.Color.fromCssColorString(hex)

        const ent = viewer.entities.add({
          id:       `damage-${pt.id}`,
          show:     true,
          position: CesiumLib.Cartesian3.fromDegrees(pt.lng, pt.lat),
          billboard: {
            image:          buildingUrl(pt.damageType),
            width:          24,
            height:         28,
            verticalOrigin: CesiumLib.VerticalOrigin.BOTTOM,
            heightReference:CesiumLib.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new CesiumLib.DistanceDisplayCondition(0, 500_000),
          },
          label: {
            text:         pt.address,
            font:         '10px monospace',
            fillColor:    color,
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 2,
            style:        CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset:  new CesiumLib.Cartesian2(0, -32),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new CesiumLib.DistanceDisplayCondition(0, 200_000),
          },
        })
        damageEntitiesRef.current.push(ent)
      }
    }

    render()
  }, [damagePoints, cesiumReady, activeLayers.damagePoints])

  // ── Satellites in orbit — fetch TLE data + render 3D ─────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const render = async () => {
      // Parallel import: cesium + satellite.js (both cached after first load)
      const [CesiumLib, satjs] = await Promise.all([
        import('cesium'),
        import('satellite.js'),
      ])
      if (viewer.isDestroyed()) return

      // Remove previous satellite entities
      for (const ent of satelliteEntitiesRef.current) viewer.entities.remove(ent)
      satelliteEntitiesRef.current = []

      if (!(activeLayers.satellites ?? false)) return

      // Fetch TLE + pass data
      let passes: SatellitePass[] = []
      try {
        const res = await fetch(`/api/satellites?eventId=${eventId}`)
        if (res.ok) {
          const d = await res.json() as { satellites?: SatellitePass[] }
          passes = d.satellites ?? []
        }
      } catch { /* Celestrak unavailable */ }

      satellitePassesRef.current = passes

      const C_SAT = '#00B4FF' // --color-cyan

      for (const sat of passes) {
        if (!sat.currentPosition) continue
        const { altitudeKm } = sat.currentPosition
        const altM = altitudeKm * 1000

        // ── Live position via SGP4 (updates every 5s via closure cache) ──
        const satrec = satjs.twoline2satrec(sat.tleLine1, sat.tleLine2)
        let _cachedPos = CesiumLib.Cartesian3.fromDegrees(
          sat.currentPosition.lng, sat.currentPosition.lat, altM
        )
        let _lastPropMs = 0

        const livePosition = new CesiumLib.CallbackPositionProperty(() => {
          const nowMs = Date.now()
          if (nowMs - _lastPropMs > 5_000) {
            _lastPropMs = nowMs
            const posVel = satjs.propagate(satrec, new Date(nowMs))
            const pos = posVel?.position
            if (pos && typeof pos !== 'boolean') {
              const gmst = satjs.gstime(new Date(nowMs))
              const geo  = satjs.eciToGeodetic(pos as { x: number; y: number; z: number }, gmst)
              _cachedPos = CesiumLib.Cartesian3.fromDegrees(
                satjs.radiansToDegrees(geo.longitude),
                satjs.radiansToDegrees(geo.latitude),
                geo.height * 1_000
              )
            }
          }
          return _cachedPos
        }, false)

        // ── Satellite body (point at real altitude) ────────────────────────
        const satBody = viewer.entities.add({
          id:       `satellite-${sat.noradId}`,
          position: livePosition,
          point: {
            pixelSize:                10,
            color:                    CesiumLib.Color.fromCssColorString(C_SAT),
            outlineColor:             CesiumLib.Color.WHITE,
            outlineWidth:             1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text:                     sat.name,
            font:                     '11px monospace',
            fillColor:                CesiumLib.Color.fromCssColorString(C_SAT),
            outlineColor:             CesiumLib.Color.BLACK,
            outlineWidth:             2,
            style:                    CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset:              new CesiumLib.Cartesian2(14, 0),
            horizontalOrigin:         CesiumLib.HorizontalOrigin.LEFT,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })
        satelliteEntitiesRef.current.push(satBody)

        // ── Nadir line — dashed vertical from satellite to ground ──────────
        const nadirGround = CesiumLib.Cartesian3.fromDegrees(
          sat.currentPosition.lng, sat.currentPosition.lat, 0
        )
        const nadirTop = CesiumLib.Cartesian3.fromDegrees(
          sat.currentPosition.lng, sat.currentPosition.lat, altM
        )
        const nadir = viewer.entities.add({
          polyline: {
            positions: [nadirTop, nadirGround],
            width: 0.8,
            material: new CesiumLib.PolylineDashMaterialProperty({
              color: CesiumLib.Color.fromCssColorString(C_SAT).withAlpha(0.3),
              dashLength: 20,
            }),
          },
        })
        satelliteEntitiesRef.current.push(nadir)

        // ── Orbital track at actual altitude (next ~100 min) ───────────────
        const trackPts = sat.groundTrack.slice(0, 100).map(pt =>
          CesiumLib.Cartesian3.fromDegrees(pt.lng, pt.lat, altM)
        )

        if (trackPts.length > 1) {
          // Split at antimeridian to avoid wrap-around artefacts
          const segments: CesiumCartesian3[][] = []
          let seg: CesiumCartesian3[] = [trackPts[0]]
          for (let i = 1; i < trackPts.length; i++) {
            const prev = sat.groundTrack[i - 1]
            const curr = sat.groundTrack[i]
            if (Math.abs(curr.lng - prev.lng) > 180) {
              if (seg.length > 1) segments.push(seg)
              seg = []
            }
            seg.push(trackPts[i])
          }
          if (seg.length > 1) segments.push(seg)

          for (const s of segments) {
            const track = viewer.entities.add({
              polyline: {
                positions:  s,
                width:      1.5,
                material:   CesiumLib.Color.fromCssColorString(C_SAT).withAlpha(0.45),
                clampToGround: false,
              },
            })
            satelliteEntitiesRef.current.push(track)
          }
        }

        // ── SAR swath footprint — highlight when next capture window is soon
        if (sat.nextCaptureWindow) {
          const msUntil = sat.nextCaptureWindow.startMs - Date.now()
          // Show swath corridor on ground track during capture window
          const windowPts = sat.groundTrack
            .filter(pt => pt.t >= sat.nextCaptureWindow!.startMs && pt.t <= sat.nextCaptureWindow!.endMs)
            .map(pt => CesiumLib.Cartesian3.fromDegrees(pt.lng, pt.lat, 0))

          if (windowPts.length > 1) {
            const swath = viewer.entities.add({
              polyline: {
                positions: windowPts,
                width: 8,
                material: CesiumLib.Color.fromCssColorString('#00FF88').withAlpha(msUntil < 3_600_000 ? 0.6 : 0.2),
                clampToGround: true,
              },
            })
            satelliteEntitiesRef.current.push(swath)
          }
        }
      }
    }

    render()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady, activeLayers.satellites, eventId])

  // ── Aircraft in 3D — icons + flag labels ─────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const render = async () => {
      const CesiumLib = await import('cesium')
      if (viewer.isDestroyed()) return

      for (const ent of aircraftEntitiesRef.current) viewer.entities.remove(ent)
      aircraftEntitiesRef.current = []

      if (!(activeLayers.airTraffic ?? false) || aircraft.length === 0) return

      for (const ac of aircraft) {
        if (ac.longitude == null || ac.latitude == null) continue
        // Clamp to ground for 2D/3D position consistency — altitude causes perspective shift
        const iso2 = countryIso2(ac.originCountry) || ac.originCountry.slice(0, 2).toUpperCase()
        const callsign = ac.callsign ?? ac.icao24

        const ent = viewer.entities.add({
          id:       `aircraft-3d-${ac.icao24}`,
          position: CesiumLib.Cartesian3.fromDegrees(ac.longitude, ac.latitude, 0),
          point: {
            pixelSize:                8,
            color:                    CesiumLib.Color.fromCssColorString(ac.onGround ? '#607080' : '#00B4FF'),
            outlineColor:             CesiumLib.Color.WHITE,
            outlineWidth:             1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference:          CesiumLib.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text:                     `[${iso2}] ${callsign}`,
            font:                     '10px monospace',
            fillColor:                CesiumLib.Color.fromCssColorString('#00B4FF'),
            outlineColor:             CesiumLib.Color.BLACK,
            outlineWidth:             2,
            style:                    CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset:              new CesiumLib.Cartesian2(10, 0),
            horizontalOrigin:         CesiumLib.HorizontalOrigin.LEFT,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })
        aircraftEntitiesRef.current.push(ent)
      }

      // All-aircraft route polylines (inferred from heading)
      for (const ac of aircraft) {
        if (ac.onGround || ac.longitude == null || ac.latitude == null) continue
        const { departure, arrival } = inferFlightRoute(ac)
        if (!departure || !arrival) continue
        const line = viewer.entities.add({
          polyline: {
            positions: CesiumLib.Cartesian3.fromDegreesArray([
              departure.lng, departure.lat,
              ac.longitude,  ac.latitude,
              arrival.lng,   arrival.lat,
            ]),
            width:         0.8,
            material:      CesiumLib.Color.fromCssColorString('#00B4FF').withAlpha(0.18),
            clampToGround: true,
          },
        })
        aircraftEntitiesRef.current.push(line)
      }
    }

    render()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady, activeLayers.airTraffic, aircraft])

  // ── Flight route airports in 3D ───────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const render = async () => {
      const CesiumLib = await import('cesium')
      if (viewer.isDestroyed()) return

      for (const ent of routeEntitiesRef.current) viewer.entities.remove(ent)
      routeEntitiesRef.current = []

      if (!flightRoute) return

      const airports = [
        { ap: flightRoute.departure, role: 'DEP', color: '#00FF88' },
        { ap: flightRoute.arrival,   role: 'ARR', color: '#FFB800' },
      ]

      for (const { ap, role, color } of airports) {
        if (!ap) continue
        const iso2 = countryIso2(ap.country) || ap.countryCode || '??'

        const dot = viewer.entities.add({
          position: CesiumLib.Cartesian3.fromDegrees(ap.lng, ap.lat, 0),
          point: {
            pixelSize:                10,
            color:                    CesiumLib.Color.fromCssColorString(color),
            outlineColor:             CesiumLib.Color.WHITE,
            outlineWidth:             1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference:          CesiumLib.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text:                     `[${iso2}] ${ap.iata ?? ap.icao} · ${ap.city}`,
            font:                     '11px monospace',
            fillColor:                CesiumLib.Color.fromCssColorString(color),
            outlineColor:             CesiumLib.Color.BLACK,
            outlineWidth:             2,
            style:                    CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset:              new CesiumLib.Cartesian2(0, -20),
            verticalOrigin:           CesiumLib.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference:          CesiumLib.HeightReference.CLAMP_TO_GROUND,
          },
        })
        routeEntitiesRef.current.push(dot)
      }

      // Route polyline on surface
      if (flightRoute.departure && flightRoute.arrival) {
        const line = viewer.entities.add({
          polyline: {
            positions: [
              CesiumLib.Cartesian3.fromDegrees(flightRoute.departure.lng, flightRoute.departure.lat, 0),
              CesiumLib.Cartesian3.fromDegrees(flightRoute.arrival.lng,   flightRoute.arrival.lat,   0),
            ],
            width:             1.5,
            material:          CesiumLib.Color.fromCssColorString('#FFB800').withAlpha(0.4),
            clampToGround:     true,
          },
        })
        routeEntitiesRef.current.push(line)
      }
    }

    render()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady, flightRoute])

  // ── Airports (cyan dots) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return
    const show = !!(activeLayers.airports ?? false)
    import('cesium').then(CesiumLib => {
      if (viewer.isDestroyed()) return
      for (const ent of airportEntitiesRef.current) viewer.entities.remove(ent)
      airportEntitiesRef.current = []
      airportsDataRef.current = airports
      if (!show || airports.length === 0) return
      for (const ap of airports) {
        const ent = viewer.entities.add({
          id:       `apt-${ap.iataCode ?? ap.icaoCode ?? ap.airportName}`,
          position: CesiumLib.Cartesian3.fromDegrees(ap.longitude, ap.latitude, 10),
          point: {
            pixelSize: 9,
            color: CesiumLib.Color.fromCssColorString('#00B4FF'),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: CesiumLib.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: ap.iataCode,
            font: '10px monospace',
            fillColor: CesiumLib.Color.fromCssColorString('#00B4FF'),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 2,
            style: CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new CesiumLib.Cartesian2(0, -16),
            verticalOrigin: CesiumLib.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })
        airportEntitiesRef.current.push(ent)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady, activeLayers.airports, airports])

  // ── Weather points ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return
    const show = !!(activeLayers.weather ?? false)
    import('cesium').then(CesiumLib => {
      if (viewer.isDestroyed()) return
      for (const ent of weatherEntitiesRef.current) viewer.entities.remove(ent)
      weatherEntitiesRef.current = []
      weatherDataRef.current = weatherPoints
      if (!show || weatherPoints.length === 0) return
      for (const wp of weatherPoints) {
        const arrow = windDirArrow(wp.current.windDirection10m)
        const label = weatherCodeLabel(wp.current.weatherCode, 'es')
        const ent = viewer.entities.add({
          id:       `wx-${wp.lat.toFixed(3)}-${wp.lng.toFixed(3)}`,
          position: CesiumLib.Cartesian3.fromDegrees(wp.lng, wp.lat, 500),
          point: {
            pixelSize: 8,
            color: wp.current.precipitation > 1
              ? CesiumLib.Color.fromCssColorString('#FFB800')
              : CesiumLib.Color.fromCssColorString('#00B4FF'),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `${arrow} ${wp.current.windSpeed10m.toFixed(1)}m/s · ${label}`,
            font: '10px monospace',
            fillColor: CesiumLib.Color.fromCssColorString('#00B4FF'),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 2,
            style: CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new CesiumLib.Cartesian2(0, -16),
            verticalOrigin: CesiumLib.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })
        weatherEntitiesRef.current.push(ent)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady, activeLayers.weather, weatherPoints])

  // ── Buoys ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return
    const show = !!(activeLayers.buoys ?? false)
    import('cesium').then(CesiumLib => {
      if (viewer.isDestroyed()) return
      for (const ent of buoyEntitiesRef.current) viewer.entities.remove(ent)
      buoyEntitiesRef.current = []
      buoysDataRef.current = buoys
      if (!show || buoys.length === 0) return
      for (const b of buoys) {
        const sz = b.waveHeight !== null ? Math.max(5, Math.min(14, 5 + b.waveHeight * 1.2)) : 7
        const ent = viewer.entities.add({
          id:       `buoy-${b.id}`,
          position: CesiumLib.Cartesian3.fromDegrees(b.lng, b.lat, 0),
          point: {
            pixelSize: sz,
            color: CesiumLib.Color.fromCssColorString('#00B4FF'),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: CesiumLib.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: b.waveHeight !== null ? `${b.waveHeight.toFixed(1)}m` : b.id,
            font: '9px monospace',
            fillColor: CesiumLib.Color.fromCssColorString('#00B4FF'),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 2,
            style: CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new CesiumLib.Cartesian2(0, -14),
            verticalOrigin: CesiumLib.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })
        buoyEntitiesRef.current.push(ent)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady, activeLayers.buoys, buoys])

  // ── OSM infrastructure ────────────────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return
    const show = !!(activeLayers.osmInfra ?? false)
    const COLOR_MAP: Record<string, string> = {
      shelter: '#00FF88', school: '#FFB800', hospital: '#FF4444',
      fuel: '#FFB800', police: '#FF4444', fire_station: '#FF4444',
      bridge: '#607080', helipad: '#00B4FF', port: '#00B4FF',
    }
    import('cesium').then(CesiumLib => {
      if (viewer.isDestroyed()) return
      for (const ent of osmEntitiesRef.current) viewer.entities.remove(ent)
      osmEntitiesRef.current = []
      osmDataRef.current = osmFeatures
      if (!show || osmFeatures.length === 0) return
      for (const f of osmFeatures) {
        const color = COLOR_MAP[f.kind] ?? '#607080'
        const ent = viewer.entities.add({
          id:       `osm-${f.id}`,
          position: CesiumLib.Cartesian3.fromDegrees(f.lng, f.lat, 10),
          point: {
            pixelSize: 7,
            color: CesiumLib.Color.fromCssColorString(color),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: CesiumLib.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: f.name ?? f.kind,
            font: '9px monospace',
            fillColor: CesiumLib.Color.fromCssColorString(color),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 2,
            style: CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new CesiumLib.Cartesian2(0, -14),
            verticalOrigin: CesiumLib.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new CesiumLib.NearFarScalar(1e3, 1.0, 5e5, 0.0),
          },
        })
        osmEntitiesRef.current.push(ent)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady, activeLayers.osmInfra, osmFeatures])

  // ── Admin boundaries choropleth ───────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return
    const show = !!(activeLayers.population ?? false)
    import('cesium').then(CesiumLib => {
      if (viewer.isDestroyed()) return
      for (const ent of adminEntitiesRef.current) viewer.entities.remove(ent)
      adminEntitiesRef.current = []
      if (!show || boundaries.length === 0) return
      // Only render level-1 admin boundaries in 3D (less clutter)
      const lvl1 = boundaries.filter(b => b.adminLevel === 1)
      for (const b of lvl1) {
        const pop = b.population ?? 0
        const alpha = Math.min(0.55, 0.1 + pop / 10_000_000)
        if (b.geometry.type !== 'Polygon' && b.geometry.type !== 'MultiPolygon') continue
        const polys = b.geometry.type === 'Polygon'
          ? [b.geometry.coordinates as number[][][]]
          : (b.geometry.coordinates as number[][][][])
        for (const poly of polys) {
          const outer = poly[0]
          if (!outer || outer.length < 3) continue
          const positions = CesiumLib.Cartesian3.fromDegreesArray(outer.flat())
          const ent = viewer.entities.add({
            polygon: {
              hierarchy: new CesiumLib.PolygonHierarchy(positions),
              material: CesiumLib.Color.fromCssColorString('#FF4444').withAlpha(alpha),
              outline: true,
              outlineColor: CesiumLib.Color.fromCssColorString('#1A3A4A'),
              outlineWidth: 1,
              height: 0,
            },
          })
          adminEntitiesRef.current.push(ent)
        }
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady, activeLayers.population, boundaries])

  // ── USAID disaster markers ────────────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return
    const show = !!(activeLayers.usaidDisasters ?? false)
    import('cesium').then(CesiumLib => {
      if (viewer.isDestroyed()) return
      for (const ent of usaidEntitiesRef.current) viewer.entities.remove(ent)
      usaidEntitiesRef.current = []
      usaidDataRef.current = usaidDeclarations
      if (!show || usaidDeclarations.length === 0) return
      for (const d of usaidDeclarations) {
        if (d.lat === null || d.lng === null) continue
        const color = d.status === 'active' ? '#00FF88' : '#607080'
        const ent = viewer.entities.add({
          id:       `usaid-${d.id}`,
          position: CesiumLib.Cartesian3.fromDegrees(d.lng as number, d.lat as number, 0),
          point: {
            pixelSize: 10,
            color: CesiumLib.Color.fromCssColorString(color),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: CesiumLib.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: d.disasterType,
            font: '9px monospace',
            fillColor: CesiumLib.Color.fromCssColorString(color),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 2,
            style: CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new CesiumLib.Cartesian2(0, -16),
            verticalOrigin: CesiumLib.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })
        usaidEntitiesRef.current.push(ent)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady, activeLayers.usaidDisasters, usaidDeclarations])

  // ── UN OCHA FTS funding arcs ──────────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return
    const show = !!(activeLayers.funding ?? false)
    const VEN_LNG = -66.6; const VEN_LAT = 8.0
    import('cesium').then(CesiumLib => {
      if (viewer.isDestroyed()) return
      for (const ent of fundingEntitiesRef.current) viewer.entities.remove(ent)
      fundingEntitiesRef.current = []
      ftsFlowsDataRef.current = ftsFlows
      if (!show || ftsFlows.length === 0) return
      const donors = topDonors(ftsFlows, 12)
      for (const donor of donors) {
        const pos = getDonorPosition(donor.org)
        if (!pos) continue
        const arcHeight = 3_000_000 // metres at arc apex
        const ent = viewer.entities.add({
          polyline: {
            positions: new CesiumLib.CallbackProperty(() => {
              // 20-point arc
              const pts: CesiumCartesian3[] = []
              for (let i = 0; i <= 20; i++) {
                const t = i / 20
                const lat = pos.lat + (VEN_LAT - pos.lat) * t
                const lng = pos.lng + (VEN_LNG - pos.lng) * t
                const h   = Math.sin(Math.PI * t) * arcHeight
                pts.push(CesiumLib.Cartesian3.fromDegrees(lng, lat, h))
              }
              return pts
            }, false),
            width: Math.max(1, Math.log10(Math.max(1, donor.total)) * 0.4),
            material: new CesiumLib.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: CesiumLib.Color.fromCssColorString('#00FF88').withAlpha(0.6),
            }),
          },
        })
        fundingEntitiesRef.current.push(ent)

        // Donor node
        const node = viewer.entities.add({
          id:       `funding-${donor.org}`,
          position: CesiumLib.Cartesian3.fromDegrees(pos.lng, pos.lat, 0),
          point: {
            pixelSize: 7,
            color: CesiumLib.Color.fromCssColorString('#00FF88'),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: CesiumLib.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: donor.org,
            font: '9px monospace',
            fillColor: CesiumLib.Color.fromCssColorString('#00FF88'),
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 2,
            style: CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new CesiumLib.Cartesian2(0, -14),
            verticalOrigin: CesiumLib.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })
        fundingEntitiesRef.current.push(node)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady, activeLayers.funding, ftsFlows])

  // ── FlyTo target (zone search / saved events) ─────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current || !flyTo) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return
    import('cesium').then(CesiumLib => {
      if (viewer.isDestroyed()) return
      viewer.camera.flyTo({
        destination: CesiumLib.Cartesian3.fromDegrees(flyTo.lng, flyTo.lat, 80_000),
        duration: 1.5,
      })
    }).catch(() => {})
  }, [cesiumReady, flyTo])

  // ── Resize when globe becomes visible ────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current
    if (visible && viewer && !viewer.isDestroyed()) {
      viewer.resize()
    }
  }, [visible])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: visible ? 'block' : 'none',
        backgroundColor: C_BG,
      }}
    >
      {/* Error fallback */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.625rem',
              color: 'var(--color-red)',
              letterSpacing: '0.1em',
              border: '1px solid var(--color-red)',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-panel)',
            }}
          >
            [CESIUM ERROR] {error}
          </div>
        </div>
      )}

      {/* Globe canvas target — touch-action:none lets Cesium handle all touch gestures */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} />

      {/* Loading state */}
      {!cesiumReady && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.625rem',
              color: 'var(--color-cyan)',
              letterSpacing: '0.3em',
            }}
          >
            INICIALIZANDO GLOBO 3D...
          </span>
        </div>
      )}
    </div>
  )
}
