'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
import { MOCK_DAMAGE_POINTS } from '@/lib/mock-data'
import type { VulnerabilityScore } from '@/lib/vulnerability'
import type { AircraftState } from '@/lib/opensky'
import type { SatellitePass } from '@/lib/orbits'
import type { CopernicusProduct } from '@/lib/copernicus'
import FIRMSLayer from './layers/FIRMSLayer'
import type { FirmsFire } from '@/lib/firms'
import EMSCLayer from './layers/EMSCLayer'
import type { EmscEvent } from '@/lib/emsc'

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
  center = [-68.7, 10.4],
  zoom = 7,
  timelinePhase,
  timelineMs,
  flyTo,
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [viewport, setViewport] = useState({ lat: center[1], lng: center[0], zoom })
  const [targeting, setTargeting] = useState<{ x: number; y: number; nodeId: string; coords?: { lat: number; lng: number } } | null>(null)
  const [comparatorOpen, setComparatorOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<typeof MOCK_DAMAGE_POINTS[0] | undefined>()
  const [vulnerabilityScores, setVulnerabilityScores] = useState<VulnerabilityScore[]>([])
  const [aircraft, setAircraft] = useState<AircraftState[]>([])
  const [satellitePasses, setSatellitePasses] = useState<SatellitePass[]>([])
  const [sarPostProducts, setSarPostProducts] = useState<CopernicusProduct[]>([])
  const [opticalPreProducts, setOpticalPreProducts] = useState<CopernicusProduct[]>([])
  const [opticalPostProducts, setOpticalPostProducts] = useState<CopernicusProduct[]>([])
  const [fires, setFires] = useState<FirmsFire[]>([])
  const [emscEvents, setEmscEvents] = useState<EmscEvent[]>([])

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
      setMapLoaded(true)
      // Override map style to dark
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', '#00080E')
      }
    })

    map.on('move', () => {
      const c = map.getCenter()
      setViewport({ lat: c.lat, lng: c.lng, zoom: map.getZoom() })
    })

    map.on('click', (e) => {
      const { x, y } = e.point
      setTargeting({
        x,
        y,
        nodeId: genNodeId(eventId),
        coords: { lat: e.lngLat.lat, lng: e.lngLat.lng },
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Fetch satellite passes once when layer is toggled on (TLE valid 12h)
  useEffect(() => {
    if (!activeLayers.satellites) return
    if (satellitePasses.length > 0) return

    const load = async () => {
      try {
        const res = await fetch(`/api/satellites?eventId=${eventId}`)
        if (!res.ok) return
        const data = (await res.json()) as { satellites: SatellitePass[] }
        setSatellitePasses(data.satellites ?? [])
      } catch {
        // Celestrak unavailable — layer renders empty
      }
    }

    void load()
  }, [activeLayers.satellites, eventId, satellitePasses.length])

  // Fetch + poll air traffic when the layer is active (every 30 s)
  useEffect(() => {
    if (!activeLayers.airTraffic) return

    const load = async () => {
      try {
        const res = await fetch('/api/air-traffic')
        if (!res.ok) return
        const data = (await res.json()) as { aircraft: AircraftState[] }
        setAircraft(data.aircraft ?? [])
      } catch {
        // OpenSky unavailable — keep previous state
      }
    }

    void load()
    const id = setInterval(() => void load(), 30_000)
    return () => clearInterval(id)
  }, [activeLayers.airTraffic])

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

  // Fly to target when supplied from parent (ZoneSearch)
  useEffect(() => {
    if (!flyTo || !mapRef.current) return
    mapRef.current.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: 12,
      duration: 1500,
    })
  }, [flyTo])

  const handleDamagePointClick = useCallback((point: typeof MOCK_DAMAGE_POINTS[0]) => {
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
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* MapLibre container */}
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', backgroundColor: '#00080E' }}
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
              points={MOCK_DAMAGE_POINTS}
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
