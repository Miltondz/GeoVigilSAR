'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'

export interface DamagePoint {
  id: string
  lat: number
  lng: number
  address: string
  damageType: 'collapsed' | 'damaged' | 'unknown'
  sarConfidence: number  // 0-1
  buildingType?: string
}

interface DamagePointsLayerProps {
  map: MapLibreMap
  points: DamagePoint[]
  visible: boolean
}

const SOURCE_ID = 'damage-points'
const LAYER_FILL = 'damage-points-fill'
const LAYER_STROKE = 'damage-points-stroke'
const LAYER_LABEL = 'damage-points-label'

function toGeoJSON(points: DamagePoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        address: p.address,
        damageType: p.damageType,
        sarConfidence: p.sarConfidence,
        buildingType: p.buildingType ?? 'unknown',
        confidencePct: Math.round(p.sarConfidence * 100),
      },
    })),
  }
}

export default function DamagePointsLayer({ map, points, visible }: DamagePointsLayerProps) {
  useEffect(() => {
    if (!map) return

    const geojson = toGeoJSON(points)

    if (map.getSource(SOURCE_ID)) {
      (map.getSource(SOURCE_ID) as GeoJSONSource).setData(geojson)
    } else {
      map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })

      // Filled circle — color by damage type
      map.addLayer({
        id: LAYER_FILL,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'sarConfidence'],
            0, 6, 1, 12,
          ],
          'circle-color': [
            'match', ['get', 'damageType'],
            'collapsed', '#FF4444',
            'damaged',   '#FFB800',
            '#607080',  // unknown
          ],
          'circle-opacity': [
            'interpolate', ['linear'], ['get', 'sarConfidence'],
            0, 0.4, 1, 0.85,
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#E0E8F0',
        },
      })

      // Confidence % label
      map.addLayer({
        id: LAYER_LABEL,
        type: 'symbol',
        source: SOURCE_ID,
        minzoom: 12,
        layout: {
          'text-field': ['concat', ['get', 'confidencePct'], '%'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 9,
          'text-offset': [0, -1.8],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color': '#E0E8F0',
          'text-halo-color': '#000A0F',
          'text-halo-width': 1.5,
        },
      })
    }

    // Sync visibility
    const vis = visible ? 'visible' : 'none'
    if (map.getLayer(LAYER_FILL))  map.setLayoutProperty(LAYER_FILL,  'visibility', vis)
    if (map.getLayer(LAYER_LABEL)) map.setLayoutProperty(LAYER_LABEL, 'visibility', vis)

    return () => {
      if (!isMapAlive(map)) return
      if (map.getLayer(LAYER_LABEL)) map.removeLayer(LAYER_LABEL)
      if (map.getLayer(LAYER_FILL))  map.removeLayer(LAYER_FILL)
      if (map.getSource(SOURCE_ID))  map.removeSource(SOURCE_ID)
    }
  }, [map, points])  // eslint-disable-line react-hooks/exhaustive-deps

  // Sync visibility without full re-mount
  useEffect(() => {
    if (!map) return
    const vis = visible ? 'visible' : 'none'
    if (map.getLayer(LAYER_FILL))  map.setLayoutProperty(LAYER_FILL,  'visibility', vis)
    if (map.getLayer(LAYER_LABEL)) map.setLayoutProperty(LAYER_LABEL, 'visibility', vis)
  }, [map, visible])

  return null
}
