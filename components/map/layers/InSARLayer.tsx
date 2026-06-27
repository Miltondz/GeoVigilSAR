'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'

const SOURCE_ID = 'insar-browse'
const LAYER_ID = 'insar-browse-layer'

export type InSARJobStatus = 'none' | 'pending' | 'running' | 'ready' | 'failed'

interface InSARLayerProps {
  map: MapLibreMap
  browseUrl: string | null  // URL of browse PNG (null if job pending)
  bbox: [number, number, number, number]  // [west, south, east, north]
  visible: boolean
  jobStatus: InSARJobStatus
}

export default function InSARLayer({
  map,
  browseUrl,
  bbox,
  visible,
  jobStatus,
}: InSARLayerProps) {
  // Manage MapLibre source + layer
  useEffect(() => {
    const shouldRender = browseUrl !== null && jobStatus === 'ready'

    if (!shouldRender) {
      // Clean up any existing source/layer
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      return
    }

    const [west, south, east, north] = bbox

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'image',
        url: browseUrl,
        coordinates: [
          [west, north],  // NW
          [east, north],  // NE
          [east, south],  // SE
          [west, south],  // SW
        ],
      })
    }

    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        type: 'raster',
        source: SOURCE_ID,
        paint: { 'raster-opacity': 0.8 },
      })
    }

    const visibility = visible ? 'visible' : 'none'
    if (map.getLayer(LAYER_ID)) {
      map.setLayoutProperty(LAYER_ID, 'visibility', visibility)
    }

    return () => {
      if (!isMapAlive(map)) return
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, browseUrl, bbox, visible, jobStatus])

  // Overlay badge for in-progress jobs
  const isProcessing = jobStatus === 'pending' || jobStatus === 'running'

  if (!isProcessing) return null

  const statusLabel = jobStatus === 'pending' ? 'EN COLA...' : 'PROCESANDO...'

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '3rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0,26,36,0.9)',
        border: '1px solid var(--color-amber)',
        padding: '0.375rem 0.75rem',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.625rem',
          color: 'var(--color-amber)',
          letterSpacing: '0.15em',
        }}
      >
        INSAR PROCESSING... {statusLabel}
      </span>
    </div>
  )
}
