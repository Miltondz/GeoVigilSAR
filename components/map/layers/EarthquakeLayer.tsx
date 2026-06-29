'use client'

import { useEffect } from 'react'
import { Marker } from 'maplibre-gl'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
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
  mapActive?: boolean
  onSelect?: (obj: { type: 'earthquake'; id: string; magnitude: number; depth: number; place: string; time: number; classification: string; lat: number; lng: number }) => void
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

export default function EarthquakeLayer({ map, earthquakes, visible, showAfterShocks = true, mapActive = true, onSelect }: EarthquakeLayerProps) {
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
      ;(map.getSource(SOURCE_ID) as GeoJSONSource).setData(geojson)
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

    // Cluster click → zoom in so individual earthquakes become visible
    const onClusterClick = (e: import('maplibre-gl').MapMouseEvent & { features?: import('maplibre-gl').MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      const clusterId = e.features[0].properties?.cluster_id as number | undefined
      if (clusterId == null) return
      const src = map.getSource(SOURCE_ID) as import('maplibre-gl').GeoJSONSource
      const coords = (e.features![0].geometry as GeoJSON.Point).coordinates as [number, number]
      src.getClusterExpansionZoom(clusterId).then((zoom: number) => {
        map.easeTo({ center: coords, zoom: zoom + 1 })
      }).catch(() => {
        map.easeTo({ center: coords, zoom: map.getZoom() + 2 })
      })
    }
    map.on('click', 'clusters', onClusterClick)
    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })

    // Individual earthquake click
    const onEqClick = (e: import('maplibre-gl').MapMouseEvent & { features?: import('maplibre-gl').MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      const f = e.features[0]
      const p = f.properties as { id: string; magnitude: number; depth: number; place: string; time: number; classification: string }
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
      onSelect?.({ type: 'earthquake', id: p.id, magnitude: p.magnitude, depth: p.depth, place: p.place, time: p.time, classification: p.classification, lat, lng })
    }
    map.on('click', LAYER_MAIN, onEqClick)
    map.on('mouseenter', LAYER_MAIN, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', LAYER_MAIN, () => { map.getCanvas().style.cursor = '' })

    return () => {
      map.off('click', 'clusters', onClusterClick)
      map.off('click', LAYER_MAIN, onEqClick)
      if (!isMapAlive(map)) return
      for (const id of ['clusters', 'cluster-count', LAYER_MAIN]) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, earthquakes, visible, showAfterShocks, onSelect])

  // ── Pulse ring HTML markers (RAF-based, no CSS keyframe dependency) ─────────
  useEffect(() => {
    if (!isMapAlive(map) || !visible || !mapActive) return
    const markers: Marker[] = []
    const animated: { rings: HTMLSpanElement[]; durationMs: number; color: string }[] = []

    for (const eq of earthquakes) {
      let color = '', durationMs = 0, ringCount = 0
      if      (eq.magnitude >= 7) { color = '#FF4444'; durationMs = 800;  ringCount = 3 }
      else if (eq.magnitude >= 6) { color = '#FF4444'; durationMs = 1000; ringCount = 3 }
      else if (eq.magnitude >= 5) { color = '#FF4444'; durationMs = 1500; ringCount = 2 }
      else if (eq.magnitude >= 4) { color = '#FFB800'; durationMs = 2500; ringCount = 2 }
      else if (eq.magnitude >= 3) { color = '#FFB800'; durationMs = 3500; ringCount = 1 }
      if (ringCount === 0) continue

      const size = magnitudeToRadius(eq.magnitude) * 3
      const el = document.createElement('div')
      el.style.cssText = `position:relative;width:${size}px;height:${size}px;pointer-events:none;overflow:visible;`

      const rings: HTMLSpanElement[] = []
      for (let i = 0; i < ringCount; i++) {
        const ring = document.createElement('span')
        ring.style.cssText = `position:absolute;inset:0;border-radius:50%;border:2px solid ${color};box-shadow:0 0 6px ${color};transform-origin:center;will-change:transform,opacity;`
        el.appendChild(ring)
        rings.push(ring)
      }

      const dot = document.createElement('span')
      dot.style.cssText = `position:absolute;inset:30%;border-radius:50%;background:${color};box-shadow:0 0 8px ${color};`
      el.appendChild(dot)

      const m = new Marker({ element: el, anchor: 'center' }).setLngLat([eq.lng, eq.lat]).addTo(map)
      markers.push(m)
      animated.push({ rings, durationMs, color })
    }

    // Single RAF loop drives all rings — works regardless of CSS load or display:none history
    let rafId: number
    const tick = () => {
      const now = performance.now()
      for (const { rings, durationMs } of animated) {
        rings.forEach((ring, i) => {
          const phase = i / rings.length
          const t = ((now / durationMs) + phase) % 1
          const scale = 1 + t * 2.5
          const opacity = Math.max(0, (1 - t) * 0.85)
          ring.style.transform = `scale(${scale.toFixed(3)})`
          ring.style.opacity = opacity.toFixed(3)
        })
      }
      rafId = requestAnimationFrame(tick)
    }
    if (animated.length > 0) tick()

    return () => {
      cancelAnimationFrame(rafId)
      markers.forEach(m => m.remove())
    }
  }, [map, earthquakes, visible, mapActive])

  return null
}
