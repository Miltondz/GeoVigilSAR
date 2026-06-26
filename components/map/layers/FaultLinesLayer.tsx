'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'

interface FaultLinesLayerProps {
  map: MapLibreMap
  visible: boolean
}

// Simplified Boconó-Morón-El Pilar fault system coordinates (WGS84)
const FAULT_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Falla Boconó', type: 'strike-slip' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-74.0, 7.8], [-73.0, 8.2], [-72.0, 8.5], [-71.0, 9.0],
          [-70.0, 9.5], [-69.5, 9.8], [-68.7, 10.2], [-68.0, 10.4],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Falla Morón', type: 'strike-slip' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-68.0, 10.4], [-67.5, 10.5], [-67.0, 10.6], [-66.5, 10.6],
          [-66.0, 10.7], [-65.5, 10.7],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Falla El Pilar', type: 'strike-slip' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-65.5, 10.7], [-65.0, 10.7], [-64.5, 10.6], [-64.0, 10.5],
          [-63.5, 10.4], [-63.0, 10.3], [-62.5, 10.2], [-61.5, 10.1],
        ],
      },
    },
  ],
}

export default function FaultLinesLayer({ map, visible }: FaultLinesLayerProps) {
  useEffect(() => {
    const SOURCE = 'fault-lines'
    const LAYER = 'fault-lines-layer'

    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, { type: 'geojson', data: FAULT_GEOJSON })
    }

    if (!map.getLayer(LAYER)) {
      map.addLayer({
        id: LAYER,
        type: 'line',
        source: SOURCE,
        paint: {
          'line-color': '#FFB800',
          'line-width': 1.5,
          'line-dasharray': [4, 2],
          'line-opacity': 0.7,
        },
      })
    }

    if (map.getLayer(LAYER)) {
      map.setLayoutProperty(LAYER, 'visibility', visible ? 'visible' : 'none')
    }

    return () => {
      if (map.getLayer(LAYER)) map.removeLayer(LAYER)
      if (map.getSource(SOURCE)) map.removeSource(SOURCE)
    }
  }, [map, visible])

  return null
}
