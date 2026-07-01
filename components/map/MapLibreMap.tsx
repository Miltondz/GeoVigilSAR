'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Scanlines from './overlays/Scanlines'
import HUDCorners from './overlays/HUDCorners'
import TargetingOverlay from './overlays/TargetingOverlay'
import EarthquakeLayer from './layers/EarthquakeLayer'
import ShakeMapLayer from './layers/ShakeMapLayer'
import FaultLinesLayer from './layers/FaultLinesLayer'
import SARLayer from './layers/SARLayer'
import InSARLayer from './layers/InSARLayer'
import type { InSARJobStatus } from './layers/InSARLayer'
import DamagePointsLayer from './layers/DamagePointsLayer'
import VulnerabilityHeatmap from './layers/VulnerabilityHeatmap'
import AirTrafficLayer from './layers/AirTrafficLayer'
import SatelliteTrackLayer from './layers/SatelliteTrackLayer'
import PhotoComparator from '@/components/panels/PhotoComparator'
import type { DamagePoint } from '@/lib/events/ven-2406'
import type { VulnerabilityScore } from '@/lib/vulnerability'
import type { AircraftState } from '@/lib/opensky'
import type { SatellitePass } from '@/lib/orbits'
import type { CopernicusProduct } from '@/lib/copernicus'
import FIRMSLayer from './layers/FIRMSLayer'
import type { FirmsFire } from '@/lib/firms'
import EMSCLayer from './layers/EMSCLayer'
import type { EmscEvent } from '@/lib/emsc'
import EMSR884Layer from './layers/EMSR884Layer'
import EMSR884ProductsLayer from './layers/EMSR884ProductsLayer'
import type { VtProductLayer } from '@/lib/emsr884'
import type { FlightRoute } from '@/lib/airports'
import FlightRouteLayer from './layers/FlightRouteLayer'
import AirportsLayer from './layers/AirportsLayer'
import WeatherLayer from './layers/WeatherLayer'
import BuoysLayer from './layers/BuoysLayer'
import InfraLayer from './layers/InfraLayer'
import PopulationLayer from './layers/PopulationLayer'
import UsaidLayer from './layers/UsaidLayer'
import FundingFlowLayer from './layers/FundingFlowLayer'
import type { AviationAirport } from '@/lib/aviationstack'
import type { WeatherPoint } from '@/lib/open-meteo'
import type { BuoyObservation } from '@/lib/ndbc'
import type { OsmFeature, OsmRoad } from '@/lib/overpass'
import type { AdminBoundary } from '@/lib/hdx'
import type { UsaidDeclaration } from '@/lib/usaid'
import type { FtsFlow } from '@/lib/fts'

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

interface ActiveLayers {
  [key: string]: boolean
}

interface FlyToTarget {
  lat: number
  lng: number
  name?: string
  bbox?: [number, number, number, number]
}

interface ViewportBbox {
  minLat: number; maxLat: number; minLng: number; maxLng: number
}

interface MapLibreMapProps {
  activeLayers: ActiveLayers
  eventId: string
  earthquakes: Earthquake[]
  center?: [number, number]
  zoom?: number
  timelinePhase?: 'pre' | 'main' | 'post'
  timelineMs?: number
  flyTo?: FlyToTarget | null
  damagePoints?: DamagePoint[]
  onSelect?: (obj: SelectedMapObject | null) => void
  onViewportChange?: (bbox: ViewportBbox) => void
  // Lifted from GeoVigilMap
  aircraft?: AircraftState[]
  flightRoute?: FlightRoute | null
  selectedAircraftIcao24?: string | null
  airports?: AviationAirport[]
  weatherPoints?: WeatherPoint[]
  buoys?: BuoyObservation[]
  osmFeatures?: OsmFeature[]
  osmRoads?: OsmRoad[]
  boundaries?: (AdminBoundary & { population: number | null })[]
  usaidDeclarations?: UsaidDeclaration[]
  ftsFlows?: FtsFlow[]
  mapActive?: boolean
  zoneBbox?: ViewportBbox | null
  satellitePasses?: SatellitePass[]
}

// Protomaps free tile style — no key required
const TILE_STYLE = 'https://demotiles.maplibre.org/style.json'

let nodeSeq = 1
function genNodeId(eventId: string) {
  return `NODE-${eventId}-${(nodeSeq++).toString(16).padStart(4, '0').toUpperCase()}`
}

export default function MapLibreMap({
  activeLayers,
  eventId,
  earthquakes,
  center = [-66.93, 10.52],
  zoom = 11,
  timelinePhase,
  timelineMs,
  flyTo,
  damagePoints = [],
  onSelect,
  onViewportChange,
  aircraft: aircraftProp = [],
  flightRoute,
  selectedAircraftIcao24,
  airports = [],
  weatherPoints = [],
  buoys = [],
  osmFeatures = [],
  osmRoads = [],
  boundaries = [],
  usaidDeclarations = [],
  ftsFlows = [],
  mapActive = true,
  zoneBbox = null,
  satellitePasses = [],
}: MapLibreMapProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<maplibregl.Map | null>(null)
  const osmLayerIdsRef = useRef<string[]>([])
  const onSelectRef          = useRef(onSelect)
  const onViewportChangeRef  = useRef(onViewportChange)
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])
  useEffect(() => { onViewportChangeRef.current = onViewportChange }, [onViewportChange])
  const viewportTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [viewport, setViewport] = useState({ lat: center[1], lng: center[0], zoom })
  const [targeting, setTargeting] = useState<{ x: number; y: number; nodeId: string; coords?: { lat: number; lng: number } } | null>(null)
  const [comparatorOpen, setComparatorOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<DamagePoint | undefined>()
  const [vulnerabilityScores, setVulnerabilityScores] = useState<VulnerabilityScore[]>([])
  // aircraft + satellitePasses come from parent GeoVigilMap (lifted state — no internal fetch)
  const aircraft = aircraftProp
  const [sarPostProducts, setSarPostProducts] = useState<CopernicusProduct[]>([])
  const [opticalPreProducts, setOpticalPreProducts] = useState<CopernicusProduct[]>([])
  const [opticalPostProducts, setOpticalPostProducts] = useState<CopernicusProduct[]>([])
  const [fires, setFires] = useState<FirmsFire[]>([])
  const [emscEvents, setEmscEvents] = useState<EmscEvent[]>([])
  const [vtLayers, setVtLayers] = useState<VtProductLayer[]>([])

  const [insarData, setInsarData] = useState<{
    browseUrl: string
    bbox: [number, number, number, number]
  } | null>(null)
  const [insarJobStatus, setInsarJobStatus] = useState<InSARJobStatus>('none')

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center,
      zoom,
      attributionControl: false,
    })

    map.on('load', () => {
      // Capture OSM basemap layer IDs before custom layers are added
      osmLayerIdsRef.current = map.getStyle().layers.map(l => l.id)
      setMapLoaded(true)
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', '#00080E')
      }
    })

    map.on('move', () => {
      const c = map.getCenter()
      setViewport({ lat: c.lat, lng: c.lng, zoom: map.getZoom() })
    })

    const emitBbox = () => {
      const b = map.getBounds()
      onViewportChangeRef.current?.({
        minLat: b.getSouth(), maxLat: b.getNorth(),
        minLng: b.getWest(),  maxLng: b.getEast(),
      })
    }

    map.on('moveend', () => {
      if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current)
      viewportTimerRef.current = setTimeout(emitBbox, 600)
    })

    // Hover cursor on damage points (earthquakes + clusters handled in EarthquakeLayer)
    map.on('mouseenter', 'damage-points-fill', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'damage-points-fill', () => { map.getCanvas().style.cursor = '' })

    map.on('click', (e) => {
      // Priority 1: damage points
      const dmgFeatures = map.queryRenderedFeatures(e.point, { layers: ['damage-points-fill'] })
      if (dmgFeatures.length > 0) {
        const f = dmgFeatures[0]
        const coords = (f.geometry as GeoJSON.Point).coordinates
        onSelectRef.current?.({
          type: 'damage',
          id:             String(f.properties?.id ?? ''),
          address:        String(f.properties?.address ?? ''),
          damageType:     (f.properties?.damageType ?? 'unknown') as 'collapsed' | 'damaged' | 'unknown',
          sarConfidence:  Number(f.properties?.sarConfidence ?? 0),
          buildingType:   f.properties?.buildingType as string | undefined,
          lat: coords[1], lng: coords[0],
        })
        return
      }

      // Default: targeting overlay (only if no layer-specific handler caught this click)
      const eqHit    = map.queryRenderedFeatures(e.point, { layers: ['earthquakes-main', 'clusters', 'osm-infra-circle', 'air-traffic-symbols'] })
      if (eqHit.length > 0) return // let layer-specific handlers deal with it

      const { x, y } = e.point
      setTargeting({ x, y, nodeId: genNodeId(eventId), coords: { lat: e.lngLat.lat, lng: e.lngLat.lng } })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Satellite basemap toggle — ESRI World Imagery (free, no key)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    if (activeLayers.satellite) {
      if (!map.getSource('esri-sat')) {
        map.addSource('esri-sat', {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '© Esri, DigitalGlobe, GeoEye, USDA FSA, USGS',
          maxzoom: 19,
        })
        const firstOsm = osmLayerIdsRef.current[0]
        map.addLayer({ id: 'sat-basemap', type: 'raster', source: 'esri-sat' }, firstOsm)
      }
      map.setLayoutProperty('sat-basemap', 'visibility', 'visible')
      for (const id of osmLayerIdsRef.current) {
        try { map.setLayoutProperty(id, 'visibility', 'none') } catch { /* skip */ }
      }
    } else {
      if (map.getLayer('sat-basemap')) {
        map.setLayoutProperty('sat-basemap', 'visibility', 'none')
      }
      for (const id of osmLayerIdsRef.current) {
        try { map.setLayoutProperty(id, 'visibility', 'visible') } catch { /* skip */ }
      }
    }
  }, [activeLayers.satellite, mapLoaded])

  // Admin boundaries + labels — ESRI Reference transparent overlay
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    if (activeLayers.adminBoundaries ?? true) {
      if (!map.getSource('esri-ref')) {
        map.addSource('esri-ref', {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '© Esri',
          maxzoom: 19,
        })
        map.addLayer({ id: 'admin-boundaries', type: 'raster', source: 'esri-ref' })
      }
      map.setLayoutProperty('admin-boundaries', 'visibility', 'visible')
    } else {
      if (map.getLayer('admin-boundaries')) {
        map.setLayoutProperty('admin-boundaries', 'visibility', 'none')
      }
    }
  }, [activeLayers.adminBoundaries, mapLoaded])

  // Fetch vulnerability scores when the layer is toggled on
  useEffect(() => {
    if (!activeLayers.vulnerability) return
    if (vulnerabilityScores.length > 0) return // already loaded

    const load = async () => {
      try {
        const res = await fetch(`/api/vulnerability?eventId=${eventId}`)
        if (!res.ok) return
        const data = (await res.json()) as VulnerabilityScore[]
        setVulnerabilityScores(data)
      } catch {
        // vulnerability API unavailable — layer renders empty
      }
    }

    void load()
  }, [activeLayers.vulnerability, eventId, vulnerabilityScores.length])

  // Aircraft data is now lifted to GeoVigilMap — no internal fetch needed

  // Fetch SAR post-event products when the layer is activated
  useEffect(() => {
    if (!activeLayers.sarChange) return
    if (sarPostProducts.length > 0) return
    fetch(`/api/sar-tiles?eventId=${eventId}`)
      .then(r => r.json())
      .then((d: { post: CopernicusProduct[] }) => setSarPostProducts(d.post ?? []))
      .catch(() => {})
  }, [activeLayers.sarChange, eventId, sarPostProducts.length])

  // Fetch optical pre-event products when the layer is activated
  useEffect(() => {
    if (!activeLayers.opticalPre) return
    if (opticalPreProducts.length > 0) return
    fetch(`/api/optical?eventId=${eventId}&phase=pre`)
      .then(r => r.json())
      .then((d: { products: CopernicusProduct[] }) => setOpticalPreProducts(d.products ?? []))
      .catch(() => {})
  }, [activeLayers.opticalPre, eventId, opticalPreProducts.length])

  // Fetch optical post-event products when the layer is activated
  useEffect(() => {
    if (!activeLayers.opticalPost) return
    if (opticalPostProducts.length > 0) return
    fetch(`/api/optical?eventId=${eventId}&phase=post`)
      .then(r => r.json())
      .then((d: { products: CopernicusProduct[] }) => setOpticalPostProducts(d.products ?? []))
      .catch(() => {})
  }, [activeLayers.opticalPost, eventId, opticalPostProducts.length])

  // Fetch FIRMS fire data when layer toggled on
  useEffect(() => {
    if (!activeLayers.firms) return
    if (fires.length > 0) return
    fetch('/api/firms')
      .then(r => r.json())
      .then((d: { fires: FirmsFire[] }) => setFires(d.fires ?? []))
      .catch(() => {})
  }, [activeLayers.firms, fires.length])

  // Fetch EMSC seismic events when layer toggled on
  useEffect(() => {
    if (!activeLayers.emscSeismic) return
    if (emscEvents.length > 0) return
    fetch('/api/emsc')
      .then(r => r.json())
      .then((d: { events: EmscEvent[] }) => setEmscEvents(d.events ?? []))
      .catch(() => {})
  }, [activeLayers.emscSeismic, emscEvents.length])

  // Fetch EMSR884 VT product layers when toggle is active
  useEffect(() => {
    if (!activeLayers.emsr884Products) return
    if (vtLayers.length > 0) return
    fetch('/api/emsr884')
      .then(r => r.json())
      .then((d: { vtLayers?: VtProductLayer[] }) => setVtLayers(d.vtLayers ?? []))
      .catch(() => {})
  }, [activeLayers.emsr884Products, vtLayers.length])

  // Fetch InSAR job status when the layer is toggled on
  useEffect(() => {
    if (!activeLayers.insar) return

    interface InsarStatusResponse {
      hasSucceeded: boolean
      latestBrowseUrl: string | null
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/insar?action=status&eventId=${eventId}`)
        if (!res.ok) return
        const data = (await res.json()) as InsarStatusResponse
        if (data.hasSucceeded && data.latestBrowseUrl) {
          setInsarData({ browseUrl: data.latestBrowseUrl, bbox: [-74, 0, -59, 13] })
          setInsarJobStatus('ready')
        }
      } catch {
        // InSAR API unavailable — layer renders empty
      }
    }

    void load()
  }, [activeLayers.insar, eventId])

  // Fly to target when supplied from parent (ZoneSearch) — fit the place's
  // actual extent (bbox) when available so a country search doesn't end up
  // zoomed to a city block; falls back to a fixed zoom for point results.
  useEffect(() => {
    if (!flyTo || !mapRef.current) return
    if (flyTo.bbox) {
      const [minLat, maxLat, minLng, maxLng] = flyTo.bbox
      mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
        padding: 40,
        duration: 1500,
      })
    } else {
      mapRef.current.flyTo({
        center: [flyTo.lng, flyTo.lat],
        zoom: 12,
        duration: 1500,
      })
    }
  }, [flyTo])

  // Zone bbox highlight — drawn when user clicks "Analizar Zona"
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const SRC = 'zone-bbox-src'
    const LYR_FILL = 'zone-bbox-fill'
    const LYR_LINE = 'zone-bbox-line'

    if (!zoneBbox) {
      if (map.getLayer(LYR_FILL)) map.removeLayer(LYR_FILL)
      if (map.getLayer(LYR_LINE)) map.removeLayer(LYR_LINE)
      if (map.getSource(SRC))    map.removeSource(SRC)
      return
    }

    const { minLng, minLat, maxLng, maxLat } = zoneBbox
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [minLng, minLat], [maxLng, minLat],
            [maxLng, maxLat], [minLng, maxLat],
            [minLng, minLat],
          ]],
        },
        properties: {},
      }],
    }

    if (!map.getSource(SRC)) {
      map.addSource(SRC, { type: 'geojson', data: geojson })
      map.addLayer({ id: LYR_FILL, type: 'fill', source: SRC, paint: { 'fill-color': '#00B4FF', 'fill-opacity': 0.04 } })
      map.addLayer({ id: LYR_LINE, type: 'line', source: SRC, paint: { 'line-color': '#00B4FF', 'line-width': 1.5, 'line-dasharray': [4, 3], 'line-opacity': 0.7 } })
    } else {
      ;(map.getSource(SRC) as import('maplibre-gl').GeoJSONSource).setData(geojson)
    }
  }, [mapLoaded, zoneBbox])

  const handleDamagePointClick = useCallback((point: DamagePoint) => {
    setSelectedNode(point)
    setComparatorOpen(true)
  }, [])

  // Transform CopernicusProduct → SARTile for the layer component
  const sarTiles = sarPostProducts.map(p => ({
    url: p.quicklookUrl,
    bounds: p.bbox,
    phase: 'post' as const,
    date: p.startDate,
  }))
  const optPreTiles = opticalPreProducts.map(p => ({
    url: p.quicklookUrl,
    bounds: p.bbox,
    phase: 'pre' as const,
    date: p.startDate,
  }))
  const optPostTiles = opticalPostProducts.map(p => ({
    url: p.quicklookUrl,
    bounds: p.bbox,
    phase: 'post' as const,
    date: p.startDate,
  }))

  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'none' }}>
        {/* MapLibre container — touch-action:none required for pan/pinch to reach MapLibre handlers */}
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', backgroundColor: '#00080E', touchAction: 'none' }}
        />

        {/* Dark overlay filter to make default tiles match HUD theme */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(rgba(0,8,14,0.4), rgba(0,8,14,0.4))',
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
        }} />

        {/* MapLibre layers (rendered once map is loaded) */}
        {mapLoaded && mapRef.current && (
          <>
            <EarthquakeLayer
              map={mapRef.current}
              earthquakes={earthquakes}
              visible={activeLayers.epicenters || activeLayers.aftershocks}
              showAfterShocks={activeLayers.aftershocks}
              mapActive={mapActive}
              onSelect={onSelectRef.current ?? undefined}
            />
            <ShakeMapLayer
              map={mapRef.current}
              eventId={eventId}
              visible={activeLayers.shakemap}
            />
            <FaultLinesLayer
              map={mapRef.current}
              visible={activeLayers.faults}
            />
            <SARLayer
              map={mapRef.current}
              tiles={sarTiles}
              visible={activeLayers.sarChange}
              sourcePrefix="sar"
            />
            <SARLayer
              map={mapRef.current}
              tiles={optPreTiles}
              visible={activeLayers.opticalPre ?? false}
              sourcePrefix="optical-pre"
            />
            <SARLayer
              map={mapRef.current}
              tiles={optPostTiles}
              visible={activeLayers.opticalPost ?? false}
              sourcePrefix="optical-post"
            />
            <DamagePointsLayer
              map={mapRef.current}
              points={damagePoints}
              visible={activeLayers.damagePoints ?? false}
            />
            <VulnerabilityHeatmap
              map={mapRef.current}
              scores={vulnerabilityScores}
              visible={activeLayers.vulnerability ?? false}
            />
            <AirTrafficLayer
              map={mapRef.current}
              aircraft={aircraft}
              visible={activeLayers.airTraffic ?? false}
              onSelect={onSelectRef.current ?? undefined}
            />
            <FlightRouteLayer
              map={mapRef.current}
              flightRoute={flightRoute ?? null}
              selectedIcao24={selectedAircraftIcao24 ?? null}
              aircraft={aircraft}
              visible={!!(activeLayers.airTraffic && selectedAircraftIcao24)}
            />
            <SatelliteTrackLayer
              map={mapRef.current}
              passes={satellitePasses}
              visible={activeLayers.satellites ?? false}
            />
            <FIRMSLayer
              map={mapRef.current}
              fires={fires}
              visible={activeLayers.firms ?? false}
            />
            <InSARLayer
              map={mapRef.current}
              browseUrl={insarData?.browseUrl ?? null}
              bbox={insarData?.bbox ?? [-74, 0, -59, 13]}
              visible={activeLayers.insar ?? false}
              jobStatus={insarJobStatus}
            />
            <EMSCLayer
              map={mapRef.current}
              events={emscEvents}
              visible={activeLayers.emscSeismic ?? false}
            />
            <EMSR884Layer
              map={mapRef.current}
              visible={activeLayers.emsr884 ?? false}
            />
            <EMSR884ProductsLayer
              map={mapRef.current}
              vtLayers={vtLayers}
              visible={activeLayers.emsr884Products ?? false}
            />
            <AirportsLayer
              map={mapRef.current}
              airports={airports}
              visible={activeLayers.airports ?? false}
              onSelect={onSelectRef.current ?? undefined}
            />
            <WeatherLayer
              map={mapRef.current}
              points={weatherPoints}
              visible={activeLayers.weather ?? false}
              onSelect={onSelectRef.current ?? undefined}
            />
            <BuoysLayer
              map={mapRef.current}
              buoys={buoys}
              visible={activeLayers.buoys ?? false}
              onSelect={onSelectRef.current ?? undefined}
            />
            <InfraLayer
              map={mapRef.current}
              features={osmFeatures}
              roads={osmRoads}
              visible={activeLayers.osmInfra ?? false}
              onSelect={onSelectRef.current ?? undefined}
            />
            <PopulationLayer
              map={mapRef.current}
              boundaries={boundaries}
              visible={activeLayers.population ?? false}
              onSelect={onSelectRef.current ?? undefined}
            />
            <UsaidLayer
              map={mapRef.current}
              declarations={usaidDeclarations}
              visible={activeLayers.usaidDisasters ?? false}
              onSelect={onSelectRef.current ?? undefined}
            />
            <FundingFlowLayer
              map={mapRef.current}
              flows={ftsFlows}
              visible={activeLayers.funding ?? false}
              onSelect={onSelectRef.current ?? undefined}
            />
          </>
        )}

        {/* Targeting overlay */}
        {targeting && (
          <TargetingOverlay
            point={{ x: targeting.x, y: targeting.y }}
            nodeId={targeting.nodeId}
            coords={targeting.coords}
            onClose={() => setTargeting(null)}
          />
        )}

        {/* HUD overlays */}
        <Scanlines />
        <HUDCorners
          centerLat={viewport.lat}
          centerLng={viewport.lng}
          zoom={viewport.zoom}
          flightCount={aircraft.length}
          timelinePhase={timelinePhase}
          timelineMs={timelineMs}
        />
      </div>

      <PhotoComparator
        isOpen={comparatorOpen}
        onClose={() => setComparatorOpen(false)}
        node={selectedNode}
      />
    </>
  )
}
