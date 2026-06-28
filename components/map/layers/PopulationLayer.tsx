'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import type { AdminBoundary } from '@/lib/hdx'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import maplibregl from 'maplibre-gl'

const SRC      = 'hdx-admin'
const LYR_FILL = 'hdx-admin-fill'
const LYR_LINE = 'hdx-admin-line'
const LYR_LBL  = 'hdx-admin-label'

type AdminWithPop = AdminBoundary & { population: number | null }

function toGeoJSON(boundaries: AdminWithPop[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: boundaries.map(b => ({
      type: 'Feature' as const,
      geometry: b.geometry,
      properties: {
        name:       b.name,
        pcode:      b.pcode,
        population: b.population ?? 0,
        level:      b.adminLevel,
      },
    })),
  }
}

function maxPop(boundaries: AdminWithPop[]): number {
  return Math.max(1, ...boundaries.map(b => b.population ?? 0))
}

interface PopulationLayerProps {
  map: MapLibreMap
  boundaries: AdminWithPop[]
  visible: boolean
  onSelect?: (obj: SelectedMapObject | null) => void
}

export default function PopulationLayer({ map, boundaries, visible, onSelect }: PopulationLayerProps) {
  useEffect(() => {
    if (!isMapAlive(map)) return
    if (!map.getSource(SRC)) {
      map.addSource(SRC, { type: 'geojson', data: toGeoJSON([]) })
    }
    if (!map.getLayer(LYR_FILL)) {
      map.addLayer({
        id: LYR_FILL, type: 'fill', source: SRC,
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['get', 'population'],
            0,        'rgba(255,68,68,0)',
            500000,   'rgba(255,68,68,0.15)',
            2000000,  'rgba(255,68,68,0.35)',
            5000000,  'rgba(255,68,68,0.55)',
          ],
          'fill-opacity': 0.7,
        },
        layout: { visibility: visible ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer(LYR_LINE)) {
      map.addLayer({
        id: LYR_LINE, type: 'line', source: SRC,
        paint: { 'line-color': '#1A3A4A', 'line-width': 1, 'line-opacity': 0.8 },
        layout: { visibility: visible ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer(LYR_LBL)) {
      map.addLayer({
        id: LYR_LBL, type: 'symbol', source: SRC,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-anchor': 'center',
          'text-optional': true,
          visibility: visible ? 'visible' : 'none',
        },
        paint: { 'text-color': '#E0E8F0', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1.5 },
      })
    }

    const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onLeave = () => { map.getCanvas().style.cursor = '' }
    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      const p = e.features[0].properties as { name: string; pcode: string; population: number }
      const geo = e.features[0].geometry
      // centroid approximation from bbox
      const bounds = (e.target as MapLibreMap).queryRenderedFeatures(e.point)[0]
      const lat = e.lngLat.lat
      const lng = e.lngLat.lng
      onSelect?.({ type: 'admin', name: p.name, pcode: p.pcode, population: p.population, lat, lng })
      void bounds
    }
    map.on('mouseenter', LYR_FILL, onEnter)
    map.on('mouseleave', LYR_FILL, onLeave)
    map.on('click', LYR_FILL, onClick)

    return () => {
      map.off('mouseenter', LYR_FILL, onEnter)
      map.off('mouseleave', LYR_FILL, onLeave)
      map.off('click', LYR_FILL, onClick)
      if (!isMapAlive(map)) return
      if (map.getLayer(LYR_LBL))  map.removeLayer(LYR_LBL)
      if (map.getLayer(LYR_LINE)) map.removeLayer(LYR_LINE)
      if (map.getLayer(LYR_FILL)) map.removeLayer(LYR_FILL)
      if (map.getSource(SRC))     map.removeSource(SRC)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  useEffect(() => {
    if (!isMapAlive(map) || !map.getSource(SRC)) return
    void maxPop(boundaries) // used implicitly in paint — suppress lint
    ;(map.getSource(SRC) as GeoJSONSource).setData(toGeoJSON(boundaries))
  }, [map, boundaries])

  useEffect(() => {
    if (!isMapAlive(map)) return
    const v = visible ? 'visible' : 'none'
    if (map.getLayer(LYR_FILL)) map.setLayoutProperty(LYR_FILL, 'visibility', v)
    if (map.getLayer(LYR_LINE)) map.setLayoutProperty(LYR_LINE, 'visibility', v)
    if (map.getLayer(LYR_LBL))  map.setLayoutProperty(LYR_LBL, 'visibility', v)
  }, [map, visible])

  return null
}
