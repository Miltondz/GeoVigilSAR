'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
import type { DateRange } from '@/components/map/controls/DateFilter'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import type { FlightRoute } from '@/lib/airports'
import type { AircraftState } from '@/lib/opensky'
import type { AviationAirport } from '@/lib/aviationstack'
import type { WeatherPoint } from '@/lib/open-meteo'
import type { BuoyObservation } from '@/lib/ndbc'
import type { OsmFeature, OsmRoad } from '@/lib/overpass'
import type { AdminBoundary } from '@/lib/hdx'
import type { UsaidDeclaration } from '@/lib/usaid'
import type { FtsFlow } from '@/lib/fts'
import MapDetailPanel from '@/components/panels/MapDetailPanel'
import Scanlines from './overlays/Scanlines'
import HUDCorners from './overlays/HUDCorners'
import VisionModeOverlay from './overlays/VisionModeOverlay'
import type { VisionMode } from './overlays/VisionModeOverlay'
import type { EarthquakeMarker } from './Cesium3DGlobe'
import type { DamagePoint } from '@/lib/events/ven-2406'
import ZoneAnalyzeButton from './controls/ZoneAnalyzeButton'
import type { ZoneSnapshot } from '@/lib/zone-cache'
import { getEvent } from '@/lib/events/index'

// MapLibre requires client-only — no SSR
const MapLibreMap = dynamic(() => import('./MapLibreMap'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
})

// CesiumJS is WebGL-only — no SSR, lazy-loaded only when needed
const Cesium3DGlobe = dynamic(() => import('./Cesium3DGlobe'), {
  ssr: false,
  loading: () => null,
})

interface Earthquake {
  id: string
  magnitude: number
  depth: number
  lat: number
  lng: number
  time: number
  place: string
  classification: string
}

interface FlyToTarget {
  lat: number
  lng: number
  name?: string
}

interface ViewportBbox {
  minLat: number; maxLat: number; minLng: number; maxLng: number
}

interface GeoVigilMapProps {
  activeLayers: Record<string, boolean>
  eventId: string
  onEarthquakesLoaded?: (earthquakes: Earthquake[]) => void
  onViewportChange?: (bbox: ViewportBbox) => void
  onZoneSnapshot?: (snapshot: ZoneSnapshot) => void
  timelinePhase?: 'pre' | 'main' | 'post'
  timelineMs?: number
  flyTo?: FlyToTarget | null
  damagePoints?: DamagePoint[]
  dateFilter?: DateRange
  currentZoneSnapshot?: ZoneSnapshot | null
  viewMode: '2d' | '3d'
  onViewModeChange: (m: '2d' | '3d') => void
  visionMode: VisionMode
  onVisionModeChange: (m: VisionMode) => void
}

function MapPlaceholder() {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#00080E', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(26,58,74,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(26,58,74,0.2) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />
      <div style={{ textAlign: 'center', opacity: 0.2, position: 'relative' }}>
        <div style={{ fontFamily: 'var(--font-headline)', fontSize: '3rem', color: 'var(--color-cyan)', letterSpacing: '0.3em', fontWeight: 700 }}>VENEZUELA</div>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', letterSpacing: '0.4em', marginTop: '0.5rem' }}>INICIALIZANDO MAPA...</div>
      </div>
      <Scanlines />
      <HUDCorners />
    </div>
  )
}

function toMarker(eq: Earthquake): EarthquakeMarker {
  return { id: eq.id, magnitude: eq.magnitude, lat: eq.lat, lng: eq.lng, depth: eq.depth, place: eq.place, time: eq.time }
}

export default function GeoVigilMap({ activeLayers, eventId, onEarthquakesLoaded, onViewportChange, onZoneSnapshot, timelinePhase, timelineMs, flyTo, damagePoints = [], dateFilter, currentZoneSnapshot, viewMode, onViewModeChange, visionMode, onVisionModeChange }: GeoVigilMapProps) {
  const [earthquakes, setEarthquakes]       = useState<Earthquake[]>([])
  const [lastFetch, setLastFetch]           = useState(0)
  const [selectedObject, setSelectedObject] = useState<SelectedMapObject | null>(null)
  const [flightRoute, setFlightRoute]       = useState<FlightRoute | null>(null)
  const [aircraft, setAircraft]             = useState<AircraftState[]>([])
  const [viewportBbox, setViewportBbox]     = useState<ViewportBbox | null>(null)
  const [zoneBbox, setZoneBbox]             = useState<ViewportBbox | null>(null)
  const [airports, setAirports]             = useState<AviationAirport[]>([])
  const [weatherPts, setWeatherPts]         = useState<WeatherPoint[]>([])
  const [buoys, setBuoys]                   = useState<BuoyObservation[]>([])
  const [osmFeatures, setOsmFeatures]       = useState<OsmFeature[]>([])
  const [osmRoads, setOsmRoads]             = useState<OsmRoad[]>([])
  const [boundaries, setBoundaries]         = useState<(AdminBoundary & { population: number | null })[]>([])
  const [usaidDecl, setUsaidDecl]           = useState<UsaidDeclaration[]>([])
  const [ftsFlows, setFtsFlows]             = useState<FtsFlow[]>([])
  const onViewportChangeRef                 = useCallback((bbox: ViewportBbox) => {
    setViewportBbox(bbox)
    onViewportChange?.(bbox)
  }, [onViewportChange])

  const handleSelect = useCallback((obj: SelectedMapObject | null) => setSelectedObject(obj), [])
  const handleCloseDetail = useCallback(() => {
    setSelectedObject(null)
    setFlightRoute(null)
  }, [])

  // Fetch USGS earthquakes.
  // Within the event bbox → always use event bbox (stable, no re-fetch on pan).
  // Outside event bbox → use viewport bbox with 30-day rolling window (dynamic discovery).
  // Only "dataRegion" changes trigger a re-fetch, not every small pan.
  const [dataRegion, setDataRegion] = useState<'event' | ViewportBbox>('event')
  useEffect(() => {
    if (!viewportBbox) return
    const ev = getEvent(eventId).bbox
    const centerLat = (viewportBbox.minLat + viewportBbox.maxLat) / 2
    const centerLng = (viewportBbox.minLng + viewportBbox.maxLng) / 2
    const insideEvent = (
      centerLat >= ev.minLat && centerLat <= ev.maxLat &&
      centerLng >= ev.minLng && centerLng <= ev.maxLng
    )
    setDataRegion(insideEvent ? 'event' : viewportBbox)
  }, [eventId, viewportBbox])

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams({ eventId })
        if (dateFilter?.start) params.set('startTime', dateFilter.start)
        if (dateFilter?.end)   params.set('endTime',   dateFilter.end)
        if (dataRegion !== 'event') {
          params.set('minLat', dataRegion.minLat.toFixed(4))
          params.set('maxLat', dataRegion.maxLat.toFixed(4))
          params.set('minLng', dataRegion.minLng.toFixed(4))
          params.set('maxLng', dataRegion.maxLng.toFixed(4))
        }
        const res = await fetch(`/api/earthquakes?${params.toString()}`)
        if (!res.ok) return
        const data = await res.json()
        const quakes = data.earthquakes ?? []
        setEarthquakes(quakes)
        setLastFetch(data.lastUpdated)
        onEarthquakesLoaded?.(quakes)
      } catch { /* USGS unavailable */ }
    }
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [eventId, onEarthquakesLoaded, dateFilter, dataRegion])

  // Fetch + poll air traffic (60s — stays within OpenSky anon quota)
  useEffect(() => {
    if (!activeLayers.airTraffic) { setAircraft([]); return }
    const load = async () => {
      try {
        const res = await fetch('/api/air-traffic')
        if (!res.ok) return
        const data = (await res.json()) as { aircraft: AircraftState[] }
        setAircraft(data.aircraft ?? [])
      } catch { /* OpenSky unavailable */ }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [activeLayers.airTraffic])

  // Fetch flight route when aircraft is selected
  useEffect(() => {
    if (selectedObject?.type !== 'aircraft') { setFlightRoute(null); return }
    const icao24 = selectedObject.icao24
    setFlightRoute(null)
    // Pass current position + heading so the API can infer route when no credentials
    const ac = aircraft.find(a => a.icao24 === icao24)
    const params = new URLSearchParams()
    if (ac?.latitude != null)  params.set('lat',     ac.latitude.toString())
    if (ac?.longitude != null) params.set('lng',     ac.longitude.toString())
    if (ac?.heading != null)   params.set('heading', ac.heading.toString())
    if (ac?.velocity != null)  params.set('speed',   ac.velocity.toString())
    fetch(`/api/aircraft/${icao24}?${params.toString()}`)
      .then(r => r.json())
      .then((d: FlightRoute) => setFlightRoute(d))
      .catch(() => {})
  }, [selectedObject, aircraft])

  // Airports — load once on mount (30-day cache, static fallback)
  useEffect(() => {
    if (!activeLayers.airports) return
    if (airports.length > 0) return
    fetch('/api/aviation-airports')
      .then(r => r.json())
      .then((d: { airports: AviationAirport[] }) => setAirports(d.airports ?? []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers.airports])

  // Weather — re-fetch when layer toggled or viewport center changes
  useEffect(() => {
    if (!activeLayers.weather) { setWeatherPts([]); return }
    const center = viewportBbox
      ? { lat: (viewportBbox.minLat + viewportBbox.maxLat) / 2, lng: (viewportBbox.minLng + viewportBbox.maxLng) / 2 }
      : getEvent(eventId).epicenter
    fetch(`/api/weather?lat=${center.lat.toFixed(4)}&lng=${center.lng.toFixed(4)}&grid=1`)
      .then(r => r.json())
      .then((d: { points: WeatherPoint[] }) => setWeatherPts(d.points ?? []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers.weather, viewportBbox, eventId])

  // Buoys — load once when layer activated
  useEffect(() => {
    if (!activeLayers.buoys) return
    if (buoys.length > 0) return
    fetch('/api/buoys')
      .then(r => r.json())
      .then((d: { buoys: BuoyObservation[] }) => setBuoys(d.buoys ?? []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers.buoys])

  // OSM infrastructure — re-fetch on viewport change
  useEffect(() => {
    if (!activeLayers.osmInfra) { setOsmFeatures([]); setOsmRoads([]); return }
    const bbox = viewportBbox
      ? `${viewportBbox.minLng.toFixed(4)},${viewportBbox.minLat.toFixed(4)},${viewportBbox.maxLng.toFixed(4)},${viewportBbox.maxLat.toFixed(4)}`
      : '-67.5,10.0,-66.0,11.5'
    fetch(`/api/osm-infra?bbox=${bbox}&roads=1`)
      .then(r => r.json())
      .then((d: { features: OsmFeature[]; roads: OsmRoad[] }) => {
        setOsmFeatures(d.features ?? [])
        setOsmRoads(d.roads ?? [])
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers.osmInfra, viewportBbox])

  // Admin boundaries + population — load once
  useEffect(() => {
    if (!activeLayers.population) return
    if (boundaries.length > 0) return
    Promise.all([
      fetch('/api/hdx?kind=admin').then(r => r.json()),
      fetch('/api/hdx?kind=population').then(r => r.json()),
    ])
      .then(([adminData, popData]: [{ boundaries: AdminBoundary[] }, { stats: { pcode: string; population: number }[] }]) => {
        const popMap = new Map((popData.stats ?? []).map((s: { pcode: string; population: number }) => [s.pcode, s.population]))
        const merged = (adminData.boundaries ?? []).map((b: AdminBoundary) => ({
          ...b,
          population: popMap.get(b.pcode) ?? null,
        }))
        setBoundaries(merged)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers.population])

  // USAID disaster declarations — load once
  useEffect(() => {
    if (!activeLayers.usaidDisasters) return
    if (usaidDecl.length > 0) return
    fetch('/api/usaid')
      .then(r => r.json())
      .then((d: { declarations: UsaidDeclaration[] }) => setUsaidDecl(d.declarations ?? []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers.usaidDisasters])

  // UN OCHA FTS funding flows — load once
  useEffect(() => {
    if (!activeLayers.funding) return
    if (ftsFlows.length > 0) return
    fetch('/api/fts')
      .then(r => r.json())
      .then((d: { flows: FtsFlow[] }) => setFtsFlows(d.flows ?? []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers.funding])

  // Clear zone bbox when snapshot is cleared from parent
  useEffect(() => {
    if (!currentZoneSnapshot) setZoneBbox(null)
  }, [currentZoneSnapshot])

  const eventCfg                = getEvent(eventId)
  const epicenter               = eventCfg.epicenter
  const selectedAircraftIcao24  = selectedObject?.type === 'aircraft' ? selectedObject.icao24 : null

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', touchAction: 'none' }}>

      {/* Canvas wrapper — filter applied here so WebGL (Cesium) + DOM (MapLibre) both affected */}
      <div
        className={visionMode !== 'NORMAL' ? `vision-canvas-${visionMode.toLowerCase()}` : undefined}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* 2D MapLibre — hidden (not unmounted) when in 3D mode */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: viewMode === '2d' ? 'block' : 'none',
        }}>
          <MapLibreMap
            activeLayers={activeLayers}
            eventId={eventId}
            earthquakes={earthquakes}
            center={[epicenter.lng, epicenter.lat]}
            zoom={eventCfg.initialZoom}
            mapActive={viewMode === '2d'}
            timelinePhase={timelinePhase}
            timelineMs={timelineMs}
            flyTo={flyTo}
            damagePoints={damagePoints}
            onSelect={handleSelect}
            onViewportChange={onViewportChangeRef}
            aircraft={aircraft}
            flightRoute={flightRoute}
            selectedAircraftIcao24={selectedAircraftIcao24}
            airports={airports}
            weatherPoints={weatherPts}
            buoys={buoys}
            osmFeatures={osmFeatures}
            osmRoads={osmRoads}
            boundaries={boundaries}
            usaidDeclarations={usaidDecl}
            ftsFlows={ftsFlows}
            zoneBbox={zoneBbox}
          />
        </div>

        {/* 3D Cesium Globe */}
        <Cesium3DGlobe
          epicenter={epicenter}
          earthquakes={earthquakes.map(toMarker)}
          visible={viewMode === '3d'}
          satellite={!!activeLayers.satellite}
          activeLayers={activeLayers}
          damagePoints={damagePoints}
          onSelect={handleSelect}
          onViewportChange={onViewportChangeRef}
          eventId={eventId}
          aircraft={aircraft}
          flightRoute={flightRoute}
          selectedAircraftIcao24={selectedAircraftIcao24}
          flyTo={flyTo}
          airports={airports}
          weatherPoints={weatherPts}
          buoys={buoys}
          osmFeatures={osmFeatures}
          boundaries={boundaries}
          usaidDeclarations={usaidDecl}
          ftsFlows={ftsFlows}
        />
      </div>

      {/* Detail panel — slide-in over map area */}
      <MapDetailPanel
        object={selectedObject}
        onClose={handleCloseDetail}
        eventId={eventId}
        flightRoute={flightRoute}
      />

      {/* Vision mode overlay */}
      <VisionModeOverlay mode={visionMode} />

      {/* Bottom-left: USGS badge + zone analyze button */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        zIndex: 25,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        {earthquakes.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(0,10,15,0.85)',
            border: '1px solid var(--color-slate)',
            padding: '0.25rem 0.5rem',
            backdropFilter: 'blur(4px)',
          }}>
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-cyan)', letterSpacing: '0.1em' }}>
              USGS LIVE · {earthquakes.length} sismos · {lastFetch ? new Date(lastFetch).toISOString().slice(11, 19) + ' UTC' : '—'}
            </span>
          </div>
        )}
        <ZoneAnalyzeButton
          viewportBbox={viewportBbox}
          onSnapshot={snap => {
            setZoneBbox(viewportBbox)
            onZoneSnapshot?.(snap)
          }}
          hasSnapshot={!!currentZoneSnapshot}
          snapshotAge={currentZoneSnapshot ? Date.now() - currentZoneSnapshot.fetchedAt : undefined}
          eventTime={getEvent(eventId).mainShockTime}
        />
      </div>
    </div>
  )
}
