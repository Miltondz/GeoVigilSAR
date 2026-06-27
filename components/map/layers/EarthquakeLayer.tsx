'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'

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

interface EarthquakeLayerProps {
  map: MapLibreMap
  earthquakes: Earthquake[]
  visible: boolean
  showAfterShocks?: boolean
}

function magnitudeToRadius(mag: number): number {
  if (mag >= 7.0) return 30
  if (mag >= 6.0) return 20
  if (mag >= 5.0) return 14
  if (mag >= 4.0) return 9
  if (mag >= 3.0) return 6
  return 4
}

function depthToColor(depth: number): string {
  if (depth <= 20) return '#FF4444'
  if (depth <= 70) return '#FFB800'
  return '#00B4FF'
}

export default function EarthquakeLayer({ map, earthquakes, visible, showAfterShocks = true }: EarthquakeLayerProps) {
  useEffect(() => {
    const SOURCE_ID = 'earthquakes'
    const LAYER_MAIN = 'earthquakes-main'

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: earthquakes.map(q => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [q.lng, q.lat] },
        properties: {
          id: q.id,
          magnitude: q.magnitude,
          depth: q.depth,
          place: q.place,
          time: q.time,
          classification: q.classification,
          radius: magnitudeToRadius(q.magnitude),
          color: depthToColor(q.depth),
        },
      })),
    }

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 9, clusterRadius: 40 })
    } else {
      ;(map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(geojson)
    }

    // Cluster circles
    if (!map.getLayer('clusters')) {
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#607080', 10, '#FFB800', 30, '#FF4444'],
          'circle-radius': ['step', ['get', 'point_count'], 14, 10, 20, 30, 28],
          'circle-opacity': 0.8,
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 10,
        },
        paint: { 'text-color': '#E0E8F0' },
      })
    }

    // Individual points
    if (!map.getLayer(LAYER_MAIN)) {
      map.addLayer({
        id: LAYER_MAIN,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1,
          'circle-stroke-color': ['get', 'color'],
        },
      })
    }

    const visibility = visible ? 'visible' : 'none'
    for (const id of ['clusters', 'cluster-count', LAYER_MAIN]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility)
    }

    return () => {
      if (!isMapAlive(map)) return
      for (const id of ['clusters', 'cluster-count', LAYER_MAIN]) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, earthquakes, visible, showAfterShocks])

  return null
}
