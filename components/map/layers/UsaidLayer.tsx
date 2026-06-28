'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import type { UsaidDeclaration } from '@/lib/usaid'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import maplibregl from 'maplibre-gl'

const SRC     = 'usaid-disasters'
const LYR_DOT = 'usaid-circle'
const LYR_LBL = 'usaid-label'

function toGeoJSON(declarations: UsaidDeclaration[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: declarations
      .filter(d => d.lat !== null && d.lng !== null)
      .map(d => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [d.lng as number, d.lat as number] },
        properties: {
          id:              d.id,
          country:         d.country,
          disasterType:    d.disasterType,
          declarationDate: d.declarationDate,
          status:          d.status,
          fundingUsd:      d.fundingUsd,
          description:     d.description,
          // active = green, closed = muted
          color:           d.status === 'active' ? '#00FF88' : '#607080',
        },
      })),
  }
}

interface UsaidLayerProps {
  map: MapLibreMap
  declarations: UsaidDeclaration[]
  visible: boolean
  onSelect?: (obj: SelectedMapObject | null) => void
}

export default function UsaidLayer({ map, declarations, visible, onSelect }: UsaidLayerProps) {
  useEffect(() => {
    if (!isMapAlive(map)) return
    if (!map.getSource(SRC)) {
      map.addSource(SRC, { type: 'geojson', data: toGeoJSON([]) })
    }
    if (!map.getLayer(LYR_DOT)) {
      map.addLayer({
        id: LYR_DOT, type: 'circle', source: SRC,
        paint: {
          'circle-radius': 9,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.85,
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
          'text-field': ['get', 'disasterType'],
          'text-size': 9,
          'text-offset': [0, 1.8],
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
      const p = e.features[0].properties as {
        id: string; country: string; disasterType: string
        declarationDate: string; status: string; fundingUsd: number | null; description: string
      }
      const [lng, lat] = (e.features[0].geometry as GeoJSON.Point).coordinates
      onSelect?.({ type: 'usaid', id: p.id, country: p.country, disasterType: p.disasterType, declarationDate: p.declarationDate, status: p.status, fundingUsd: p.fundingUsd, description: p.description, lat, lng })
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
    ;(map.getSource(SRC) as GeoJSONSource).setData(toGeoJSON(declarations))
  }, [map, declarations])

  useEffect(() => {
    if (!isMapAlive(map)) return
    const v = visible ? 'visible' : 'none'
    if (map.getLayer(LYR_DOT)) map.setLayoutProperty(LYR_DOT, 'visibility', v)
    if (map.getLayer(LYR_LBL)) map.setLayoutProperty(LYR_LBL, 'visibility', v)
  }, [map, visible])

  return null
}
