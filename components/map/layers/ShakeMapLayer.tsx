'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'

interface ShakeMapLayerProps {
  map: MapLibreMap
  eventId: string
  visible: boolean
}

// USGS ShakeMap GeoJSON endpoint for the Venezuela event
// Will use the actual USGS event ID once confirmed
const SHAKEMAP_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=us7000pj6z'

export default function ShakeMapLayer({ map, eventId: _eventId, visible }: ShakeMapLayerProps) {
  useEffect(() => {
    const SOURCE = 'shakemap'
    const LAYER = 'shakemap-intensity'

    if (!map.getSource(SOURCE)) {
      // Load ShakeMap as raster if GeoTIFF available, else skip
      // For now we add a placeholder intensity gradient
      map.addSource(SOURCE, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [-68.7, 10.4],
              },
              properties: { intensity: 9 },
            },
          ],
        },
      })
    }

    if (!map.getLayer(LAYER)) {
      map.addLayer({
        id: LAYER,
        type: 'circle',
        source: SOURCE,
        paint: {
          'circle-radius': 120,
          'circle-color': '#FF4444',
          'circle-opacity': 0.15,
          'circle-blur': 1,
        },
      }, 'earthquakes-main')
    }

    if (map.getLayer(LAYER)) {
      map.setLayoutProperty(LAYER, 'visibility', visible ? 'visible' : 'none')
    }

    return () => {
      if (!isMapAlive(map)) return
      if (map.getLayer(LAYER)) map.removeLayer(LAYER)
      if (map.getSource(SOURCE)) map.removeSource(SOURCE)
    }
  }, [map, visible])

  return null
}
