'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { FirmsFire } from '@/lib/firms'
import { isMapAlive } from './mapUtils'

const SOURCE_ID = 'firms-fires'
const LAYER_ID = 'firms-circles'

interface FIRMSLayerProps {
  map: maplibregl.Map
  fires: FirmsFire[]
  visible: boolean
}

export default function FIRMSLayer({ map, fires, visible }: FIRMSLayerProps) {
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!isMapAlive(map)) return

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: fires.map(f => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
        properties: {
          frp: f.frp,
          confidence: f.confidence,
          brightness: f.brightness,
          satellite: f.satellite,
          acqDate: f.acqDate,
          acqTime: f.acqTime,
          daynight: f.daynight,
          instrument: f.instrument,
        },
      })),
    }

    if (map.getSource(SOURCE_ID)) {
      ;(map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(geojson)
      return
    }

    map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })
    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 0, 4, 10, 8, 100, 16],
        'circle-color': [
          'step', ['get', 'frp'],
          '#FFB800', 10,
          '#FF8800', 50,
          '#FF4444',
        ],
        'circle-opacity': 0.75,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-opacity': 0.4,
      },
    })

    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
      const feat = e.features?.[0]
      if (!feat) return
      const p = feat.properties as Record<string, unknown>
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '220px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="background:var(--color-panel,#001A24);color:var(--color-text,#E0E8F0);font-family:var(--font-hud,'Share Tech Mono',monospace);font-size:0.625rem;padding:8px;border:1px solid var(--color-amber,#FFB800)">
            <div style="color:var(--color-amber,#FFB800);margin-bottom:4px">FIRMS / ${String(p.instrument)}</div>
            <div>FRP: <b>${Number(p.frp).toFixed(1)} MW</b></div>
            <div>Brillo: ${Number(p.brightness).toFixed(0)} K</div>
            <div>Confianza: ${Number(p.confidence)}%</div>
            <div>Satélite: ${String(p.satellite)}</div>
            <div>Fecha: ${String(p.acqDate)} ${String(p.acqTime)}</div>
            <div>Período: ${String(p.daynight) === 'D' ? 'Día' : 'Noche'}</div>
          </div>
        `)
        .addTo(map)
    }

    map.on('click', LAYER_ID, handleClick)
    map.on('mouseenter', LAYER_ID, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', LAYER_ID, () => { map.getCanvas().style.cursor = '' })

    return () => {
      popupRef.current?.remove()
      if (!isMapAlive(map)) return
      map.off('click', LAYER_ID, handleClick)
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, fires])

  useEffect(() => {
    if (!isMapAlive(map) || !map.getLayer(LAYER_ID)) return
    map.setLayoutProperty(LAYER_ID, 'visibility', visible ? 'visible' : 'none')
  }, [map, visible])

  return null
}
