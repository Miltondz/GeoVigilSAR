'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import type { OsmFeature, OsmRoad } from '@/lib/overpass'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import maplibregl from 'maplibre-gl'

const SRC_FEAT   = 'osm-infra'
const SRC_ROADS  = 'osm-roads'
const LYR_FEAT   = 'osm-infra-circle'
const LYR_LABEL  = 'osm-infra-label'
const LYR_ROADS  = 'osm-roads-line'

const KIND_COLOR: Record<string, string> = {
  hospital:     '#FF4444', // red — critical emergency facility
  helipad:      '#00B4FF', // cyan — aviation
  shelter:      '#00FF88', // --color-green
  school:       '#FFB800', // --color-amber
  fuel:         '#FFB800',
  police:       '#FF4444',
  fire_station: '#FF4444',
  bridge:       '#1A3A4A',
}

function toFeatGeoJSON(features: OsmFeature[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features.map(f => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
      properties: {
        id:    f.id,
        kind:  f.kind,
        name:  f.name ?? f.kind,
        color: KIND_COLOR[f.kind] ?? '#607080',
        tags:  JSON.stringify(f.tags),
      },
    })),
  }
}

function toRoadsGeoJSON(roads: OsmRoad[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: roads.map(r => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: r.coords },
      properties: { id: r.id, highway: r.highway, ref: r.ref },
    })),
  }
}

interface InfraLayerProps {
  map: MapLibreMap
  features: OsmFeature[]
  roads?: OsmRoad[]
  visible: boolean
  onSelect?: (obj: SelectedMapObject | null) => void
}

export default function InfraLayer({ map, features, roads = [], visible, onSelect }: InfraLayerProps) {
  useEffect(() => {
    if (!isMapAlive(map)) return

    if (!map.getSource(SRC_FEAT)) {
      map.addSource(SRC_FEAT, { type: 'geojson', data: toFeatGeoJSON([]) })
    }
    if (!map.getSource(SRC_ROADS)) {
      map.addSource(SRC_ROADS, { type: 'geojson', data: toRoadsGeoJSON([]) })
    }

    if (!map.getLayer(LYR_ROADS)) {
      map.addLayer({
        id: LYR_ROADS, type: 'line', source: SRC_ROADS,
        paint: { 'line-color': '#FFB800', 'line-opacity': 0.6, 'line-width': 1.5 },
        layout: { visibility: visible ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer(LYR_FEAT)) {
      map.addLayer({
        id: LYR_FEAT, type: 'circle', source: SRC_FEAT,
        paint: {
          'circle-radius': ['match', ['get', 'kind'], 'hospital', 10, 'helipad', 6, 7],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.9,
          'circle-stroke-color': ['match', ['get', 'kind'], 'hospital', '#ffffff', '#001A24'],
          'circle-stroke-width': ['match', ['get', 'kind'], 'hospital', 2, 1.5],
        },
        layout: { visibility: visible ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer(LYR_LABEL)) {
      map.addLayer({
        id: LYR_LABEL, type: 'symbol', source: SRC_FEAT,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 9,
          'text-offset': [0, 1.6],
          'text-anchor': 'top',
          'text-optional': true,
          visibility: visible ? 'visible' : 'none',
        },
        paint: { 'text-color': ['get', 'color'], 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
      })
    }

    const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onLeave = () => { map.getCanvas().style.cursor = '' }
    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      const p = e.features[0].properties as { id: number; kind: string; name: string; tags: string }
      const [lng, lat] = (e.features[0].geometry as GeoJSON.Point).coordinates
      let parsedTags: Record<string, string> = {}
      try { parsedTags = JSON.parse(p.tags) } catch { /* ignore */ }
      onSelect?.({ type: 'osm', id: p.id, kind: p.kind as OsmFeature['kind'], name: p.name, lat, lng, tags: parsedTags })
    }
    map.on('mouseenter', LYR_FEAT, onEnter)
    map.on('mouseleave', LYR_FEAT, onLeave)
    map.on('click', LYR_FEAT, onClick)

    return () => {
      map.off('mouseenter', LYR_FEAT, onEnter)
      map.off('mouseleave', LYR_FEAT, onLeave)
      map.off('click', LYR_FEAT, onClick)
      if (!isMapAlive(map)) return
      if (map.getLayer(LYR_LABEL)) map.removeLayer(LYR_LABEL)
      if (map.getLayer(LYR_FEAT))  map.removeLayer(LYR_FEAT)
      if (map.getLayer(LYR_ROADS)) map.removeLayer(LYR_ROADS)
      if (map.getSource(SRC_FEAT)) map.removeSource(SRC_FEAT)
      if (map.getSource(SRC_ROADS))map.removeSource(SRC_ROADS)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  useEffect(() => {
    if (!isMapAlive(map)) return
    if (map.getSource(SRC_FEAT))  (map.getSource(SRC_FEAT)  as GeoJSONSource).setData(toFeatGeoJSON(features))
    if (map.getSource(SRC_ROADS)) (map.getSource(SRC_ROADS) as GeoJSONSource).setData(toRoadsGeoJSON(roads))
  }, [map, features, roads])

  useEffect(() => {
    if (!isMapAlive(map)) return
    const v = visible ? 'visible' : 'none'
    if (map.getLayer(LYR_FEAT))  map.setLayoutProperty(LYR_FEAT, 'visibility', v)
    if (map.getLayer(LYR_LABEL)) map.setLayoutProperty(LYR_LABEL, 'visibility', v)
    if (map.getLayer(LYR_ROADS)) map.setLayoutProperty(LYR_ROADS, 'visibility', v)
  }, [map, visible])

  return null
}
