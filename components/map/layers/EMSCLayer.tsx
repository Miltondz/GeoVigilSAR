'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import type { EmscEvent } from '@/lib/emsc'

interface EMSCLayerProps {
  map: MapLibreMap
  events: EmscEvent[]
  visible: boolean
  sourcePrefix?: string
}

function magnitudeToRadius(mag: number): number {
  if (mag >= 7.0) return 28
  if (mag >= 6.0) return 18
  if (mag >= 5.0) return 12
  if (mag >= 4.0) return 8
  if (mag >= 3.0) return 5
  return 3
}

function depthToColor(depth: number): string {
  if (depth <= 20) return '#FF4444'
  if (depth <= 70) return '#FFB800'
  return '#00B4FF'
}

export default function EMSCLayer({ map, events, visible, sourcePrefix = 'emsc' }: EMSCLayerProps) {
  useEffect(() => {
    const SOURCE_ID = `${sourcePrefix}-events`
    const LAYER_ID = `${sourcePrefix}-circles`
    const LABEL_ID = `${sourcePrefix}-labels`

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: events.map(e => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
        properties: {
          id: e.id,
          magnitude: e.magnitude,
          depth: e.depth,
          region: e.region,
          time: e.time,
          radius: magnitudeToRadius(e.magnitude),
          color: depthToColor(e.depth),
          source: 'EMSC',
        },
      })),
    }

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })
    } else {
      ;(map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(geojson)
    }

    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.7,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#00B4FF',
        },
      })
    }

    if (!map.getLayer(LABEL_ID)) {
      map.addLayer({
        id: LABEL_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'text-field': ['concat', 'M', ['to-string', ['get', 'magnitude']]],
          'text-size': 8,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#00B4FF',
          'text-halo-color': '#000A0F',
          'text-halo-width': 1,
        },
      })
    }

    const visibility = visible ? 'visible' : 'none'
    for (const id of [LAYER_ID, LABEL_ID]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility)
    }

    return () => {
      if (!isMapAlive(map)) return
      for (const id of [LAYER_ID, LABEL_ID]) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, events, visible, sourcePrefix])

  return null
}
