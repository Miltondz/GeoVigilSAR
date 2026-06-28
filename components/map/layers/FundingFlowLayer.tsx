'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import type { FtsFlow, FtsPlanFunding } from '@/lib/fts'
import { getDonorPosition, topDonors } from '@/lib/fts'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import maplibregl from 'maplibre-gl'

const SRC_ARCS  = 'funding-arcs'
const SRC_NODES = 'funding-nodes'
const LYR_ARCS  = 'funding-arcs-line'
const LYR_NODES = 'funding-nodes-circle'
const LYR_LBLS  = 'funding-nodes-label'

const VEN_CENTROID: [number, number] = [-66.6, 8.0]

function greatCircleMidpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 15] // arc lifts 15° north
}

function toArcsGeoJSON(flows: FtsFlow[]): GeoJSON.FeatureCollection {
  const donors = topDonors(flows, 12)
  const features: GeoJSON.Feature[] = []

  for (const donor of donors) {
    const pos = getDonorPosition(donor.org)
    if (!pos) continue
    const from: [number, number] = [pos.lng, pos.lat]
    const mid = greatCircleMidpoint(from, VEN_CENTROID)
    // Simple quadratic bezier approximation via 3-point LineString
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [from, mid, VEN_CENTROID],
      },
      properties: {
        org:       donor.org,
        amountUsd: donor.total,
        opacity:   Math.min(0.9, 0.3 + donor.total / 2_000_000),
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function toNodesGeoJSON(flows: FtsFlow[]): GeoJSON.FeatureCollection {
  const donors = topDonors(flows, 12)
  const features: GeoJSON.Feature[] = []

  for (const donor of donors) {
    const pos = getDonorPosition(donor.org)
    if (!pos) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pos.lng, pos.lat] },
      properties: {
        org:       donor.org,
        amountUsd: donor.total,
        radius:    Math.max(4, Math.min(14, 4 + Math.log10(Math.max(1, donor.total)) * 1.5)),
      },
    })
  }
  // Venezuela destination node
  features.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: VEN_CENTROID },
    properties: { org: 'Venezuela', amountUsd: 0, radius: 10 },
  })

  return { type: 'FeatureCollection', features }
}

interface FundingFlowLayerProps {
  map: MapLibreMap
  flows: FtsFlow[]
  plans?: FtsPlanFunding[]
  visible: boolean
  onSelect?: (obj: SelectedMapObject | null) => void
}

export default function FundingFlowLayer({ map, flows, visible, onSelect }: FundingFlowLayerProps) {
  useEffect(() => {
    if (!isMapAlive(map)) return
    if (!map.getSource(SRC_ARCS)) {
      map.addSource(SRC_ARCS, { type: 'geojson', data: toArcsGeoJSON([]) })
    }
    if (!map.getSource(SRC_NODES)) {
      map.addSource(SRC_NODES, { type: 'geojson', data: toNodesGeoJSON([]) })
    }
    if (!map.getLayer(LYR_ARCS)) {
      map.addLayer({
        id: LYR_ARCS, type: 'line', source: SRC_ARCS,
        paint: {
          'line-color': '#00FF88', // --color-green
          'line-width': ['interpolate', ['linear'], ['get', 'amountUsd'], 0, 1, 10_000_000, 4],
          'line-opacity': ['get', 'opacity'],
          'line-dasharray': [4, 2],
        },
        layout: { visibility: visible ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer(LYR_NODES)) {
      map.addLayer({
        id: LYR_NODES, type: 'circle', source: SRC_NODES,
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': '#00FF88',
          'circle-opacity': 0.75,
          'circle-stroke-color': '#001A24',
          'circle-stroke-width': 1.5,
        },
        layout: { visibility: visible ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer(LYR_LBLS)) {
      map.addLayer({
        id: LYR_LBLS, type: 'symbol', source: SRC_NODES,
        layout: {
          'text-field': ['get', 'org'],
          'text-size': 9,
          'text-offset': [0, 1.6],
          'text-anchor': 'top',
          'text-optional': true,
          visibility: visible ? 'visible' : 'none',
        },
        paint: { 'text-color': '#00FF88', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
      })
    }

    const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onLeave = () => { map.getCanvas().style.cursor = '' }
    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      const p = e.features[0].properties as { org: string; amountUsd: number }
      const [lng, lat] = (e.features[0].geometry as GeoJSON.Point).coordinates
      onSelect?.({ type: 'funding', organization: p.org, totalUsd: p.amountUsd, lat, lng })
    }
    map.on('mouseenter', LYR_NODES, onEnter)
    map.on('mouseleave', LYR_NODES, onLeave)
    map.on('click', LYR_NODES, onClick)

    return () => {
      map.off('mouseenter', LYR_NODES, onEnter)
      map.off('mouseleave', LYR_NODES, onLeave)
      map.off('click', LYR_NODES, onClick)
      if (!isMapAlive(map)) return
      if (map.getLayer(LYR_LBLS))  map.removeLayer(LYR_LBLS)
      if (map.getLayer(LYR_NODES)) map.removeLayer(LYR_NODES)
      if (map.getLayer(LYR_ARCS))  map.removeLayer(LYR_ARCS)
      if (map.getSource(SRC_ARCS))  map.removeSource(SRC_ARCS)
      if (map.getSource(SRC_NODES)) map.removeSource(SRC_NODES)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  useEffect(() => {
    if (!isMapAlive(map)) return
    if (map.getSource(SRC_ARCS))  (map.getSource(SRC_ARCS)  as GeoJSONSource).setData(toArcsGeoJSON(flows))
    if (map.getSource(SRC_NODES)) (map.getSource(SRC_NODES) as GeoJSONSource).setData(toNodesGeoJSON(flows))
  }, [map, flows])

  useEffect(() => {
    if (!isMapAlive(map)) return
    const v = visible ? 'visible' : 'none'
    if (map.getLayer(LYR_ARCS))  map.setLayoutProperty(LYR_ARCS, 'visibility', v)
    if (map.getLayer(LYR_NODES)) map.setLayoutProperty(LYR_NODES, 'visibility', v)
    if (map.getLayer(LYR_LBLS))  map.setLayoutProperty(LYR_LBLS, 'visibility', v)
  }, [map, visible])

  return null
}
