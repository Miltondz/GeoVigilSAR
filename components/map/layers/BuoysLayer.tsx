'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import type { BuoyObservation } from '@/lib/ndbc'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import maplibregl from 'maplibre-gl'

const SRC      = 'buoys'
const LYR_DOT  = 'buoys-circle'
const LYR_LBL  = 'buoys-label'

function toGeoJSON(buoys: BuoyObservation[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: buoys.map(b => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [b.lng, b.lat] },
      properties: {
        id:           b.id,
        waveHeight:   b.waveHeight,
        seaTemp:      b.seaTemp,
        windSpeed:    b.windSpeed,
        airTemp:      b.airTemp,
        pressure:     b.pressure,
        label:        b.waveHeight !== null ? `🌊 ${b.waveHeight.toFixed(1)}m` : b.id,
        // radius proportional to wave height (1–8m → 5–18px)
        radius:       b.waveHeight !== null ? Math.max(5, Math.min(18, 5 + b.waveHeight * 1.6)) : 7,
      },
    })),
  }
}

interface BuoysLayerProps {
  map: MapLibreMap
  buoys: BuoyObservation[]
  visible: boolean
  onSelect?: (obj: SelectedMapObject | null) => void
}

export default function BuoysLayer({ map, buoys, visible, onSelect }: BuoysLayerProps) {
  useEffect(() => {
    if (!isMapAlive(map)) return
    if (!map.getSource(SRC)) {
      map.addSource(SRC, { type: 'geojson', data: toGeoJSON([]) })
    }
    if (!map.getLayer(LYR_DOT)) {
      map.addLayer({
        id: LYR_DOT, type: 'circle', source: SRC,
        paint: {
          'circle-radius': ['coalesce', ['get', 'radius'], 7],
          'circle-color': '#00B4FF', // --color-cyan
          'circle-opacity': 0.8,
          'circle-stroke-color': '#001A24',
          'circle-stroke-width': 1.5,
        },
        layout: { visibility: visible ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer(LYR_LBL)) {
      map.addLayer({
        id: LYR_LBL, type: 'symbol', source: SRC,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 9,
          'text-offset': [0, 1.6],
          'text-anchor': 'top',
          visibility: visible ? 'visible' : 'none',
        },
        paint: { 'text-color': '#00B4FF', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
      })
    }

    const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onLeave = () => { map.getCanvas().style.cursor = '' }
    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      const p = e.features[0].properties as {
        id: string; waveHeight: number | null; seaTemp: number | null
        windSpeed: number | null; airTemp: number | null; pressure: number | null
      }
      const [lng, lat] = (e.features[0].geometry as GeoJSON.Point).coordinates
      onSelect?.({ type: 'buoy', id: p.id, lat, lng, waveHeight: p.waveHeight, seaTemp: p.seaTemp, windSpeed: p.windSpeed, airTemp: p.airTemp, pressure: p.pressure })
    }
    map.on('mouseenter', LYR_DOT, onEnter)
    map.on('mouseleave', LYR_DOT, onLeave)
    map.on('click', LYR_DOT, onClick)

    return () => {
      map.off('mouseenter', LYR_DOT, onEnter)
      map.off('mouseleave', LYR_DOT, onLeave)
      map.off('click', LYR_DOT, onClick)
      if (!isMapAlive(map)) return
      if (map.getLayer(LYR_LBL)) map.removeLayer(LYR_LBL)
      if (map.getLayer(LYR_DOT)) map.removeLayer(LYR_DOT)
      if (map.getSource(SRC))    map.removeSource(SRC)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  useEffect(() => {
    if (!isMapAlive(map) || !map.getSource(SRC)) return
    ;(map.getSource(SRC) as GeoJSONSource).setData(toGeoJSON(buoys))
  }, [map, buoys])

  useEffect(() => {
    if (!isMapAlive(map)) return
    const v = visible ? 'visible' : 'none'
    if (map.getLayer(LYR_DOT)) map.setLayoutProperty(LYR_DOT, 'visibility', v)
    if (map.getLayer(LYR_LBL)) map.setLayoutProperty(LYR_LBL, 'visibility', v)
  }, [map, visible])

  return null
}
