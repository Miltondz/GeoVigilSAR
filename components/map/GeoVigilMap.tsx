'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import Scanlines from './overlays/Scanlines'
import HUDCorners from './overlays/HUDCorners'
import ViewModeToggle from './controls/ViewModeToggle'
import VisionModeOverlay from './overlays/VisionModeOverlay'
import VisionModeControl from './controls/VisionModeControl'
import type { VisionMode } from './overlays/VisionModeOverlay'
import type { EarthquakeMarker } from './Cesium3DGlobe'
import type { DamagePoint } from '@/lib/events/ven-2406'

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

interface GeoVigilMapProps {
  activeLayers: Record<string, boolean>
  eventId: string
  onEarthquakesLoaded?: (earthquakes: Earthquake[]) => void
  timelinePhase?: 'pre' | 'main' | 'post'
  timelineMs?: number
  flyTo?: FlyToTarget | null
  damagePoints?: DamagePoint[]
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

export default function GeoVigilMap({ activeLayers, eventId, onEarthquakesLoaded, timelinePhase, timelineMs, flyTo, damagePoints = [] }: GeoVigilMapProps) {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([])
  const [lastFetch, setLastFetch] = useState(0)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d')
  const [visionMode, setVisionMode] = useState<VisionMode>('CRT')

  // Fetch real USGS data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/earthquakes?eventId=${eventId}`)
        if (!res.ok) return
        const data = await res.json()
        const quakes = data.earthquakes ?? []
        setEarthquakes(quakes)
        setLastFetch(data.lastUpdated)
        onEarthquakesLoaded?.(quakes)
      } catch {
        // USGS unavailable — map still renders with empty layers
      }
    }

    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [eventId, onEarthquakesLoaded])

  // Derive epicenter from event — default to Venezuela 2026 epicenter
  const epicenter = { lat: 10.4, lng: -68.7 }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

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
          timelinePhase={timelinePhase}
          timelineMs={timelineMs}
          flyTo={flyTo}
          damagePoints={damagePoints}
        />
      </div>

      {/* 3D Cesium Globe — hidden (not unmounted) when in 2D mode */}
      <Cesium3DGlobe
        epicenter={epicenter}
        earthquakes={earthquakes.map(toMarker)}
        visible={viewMode === '3d'}
      />

      {/* Vision mode overlay — covers full map canvas, below UI controls */}
      <VisionModeOverlay mode={visionMode} />

      {/* Top-right HUD controls — above the vision overlay */}
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 60,
        display: 'flex',
        gap: 4,
        alignItems: 'center',
      }}>
        <VisionModeControl mode={visionMode} onChange={setVisionMode} />
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {/* Aftershock count badge */}
      {earthquakes.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          backgroundColor: 'rgba(0,10,15,0.85)',
          border: '1px solid var(--color-slate)',
          padding: '0.25rem 0.5rem',
          zIndex: 25,
          pointerEvents: 'none',
        }}>
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-cyan)', letterSpacing: '0.1em' }}>
            USGS LIVE · {earthquakes.length} sismos · {lastFetch ? new Date(lastFetch).toISOString().slice(11, 19) + ' UTC' : '—'}
          </span>
        </div>
      )}
    </div>
  )
}
