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
import DamagePointsLayer from './layers/DamagePointsLayer'
import PhotoComparator from '@/components/panels/PhotoComparator'
import { MOCK_DAMAGE_POINTS } from '@/lib/mock-data'

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

interface MapLibreMapProps {
  activeLayers: ActiveLayers
  eventId: string
  earthquakes: Earthquake[]
  center?: [number, number]
  zoom?: number
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
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [viewport, setViewport] = useState({ lat: center[1], lng: center[0], zoom })
  const [targeting, setTargeting] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [comparatorOpen, setComparatorOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<typeof MOCK_DAMAGE_POINTS[0] | undefined>()

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
      setTargeting({ x, y, nodeId: genNodeId(eventId) })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDamagePointClick = useCallback((point: typeof MOCK_DAMAGE_POINTS[0]) => {
    setSelectedNode(point)
    setComparatorOpen(true)
  }, [])

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
              tiles={[]}
              visible={activeLayers.sarChange}
            />
            <DamagePointsLayer
              map={mapRef.current}
              points={MOCK_DAMAGE_POINTS}
              visible={activeLayers.damagePoints ?? false}
            />
          </>
        )}

        {/* Targeting overlay */}
        {targeting && (
          <TargetingOverlay
            point={{ x: targeting.x, y: targeting.y }}
            nodeId={targeting.nodeId}
            onClose={() => setTargeting(null)}
          />
        )}

        {/* HUD overlays */}
        <Scanlines />
        <HUDCorners
          centerLat={viewport.lat}
          centerLng={viewport.lng}
          zoom={viewport.zoom}
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
