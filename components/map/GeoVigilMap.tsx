'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import Scanlines from './overlays/Scanlines'
import HUDCorners from './overlays/HUDCorners'
import TargetingOverlay from './overlays/TargetingOverlay'
import PhotoComparator from '@/components/panels/PhotoComparator'
import { MOCK_DAMAGE_POINTS } from '@/lib/mock-data'

// MapLibre requires client-only — no SSR
const MapLibreMap = dynamic(() => import('./MapLibreMap'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
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

interface GeoVigilMapProps {
  activeLayers: Record<string, boolean>
  eventId: string
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

export default function GeoVigilMap({ activeLayers, eventId }: GeoVigilMapProps) {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([])
  const [lastFetch, setLastFetch] = useState(0)

  // Fetch real USGS data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/earthquakes?eventId=${eventId}`)
        if (!res.ok) return
        const data = await res.json()
        setEarthquakes(data.earthquakes ?? [])
        setLastFetch(data.lastUpdated)
      } catch {
        // USGS unavailable — map still renders with empty layers
      }
    }

    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [eventId])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapLibreMap
        activeLayers={activeLayers}
        eventId={eventId}
        earthquakes={earthquakes}
      />

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
