'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import type { AviationAirport } from '@/lib/aviationstack'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import maplibregl from 'maplibre-gl'

const SRC  = 'airports'
const LYR_CIRCLE = 'airports-circle'
const LYR_LABEL  = 'airports-label'

function toGeoJSON(airports: AviationAirport[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: airports.map(a => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [a.longitude, a.latitude] },
      properties: { iataCode: a.iataCode, icaoCode: a.icaoCode, name: a.airportName, country: a.countryName },
    })),
  }
}

interface AirportsLayerProps {
  map: MapLibreMap
  airports: AviationAirport[]
  visible: boolean
  onSelect?: (obj: SelectedMapObject | null) => void
}

export default function AirportsLayer({ map, airports, visible, onSelect }: AirportsLayerProps) {
  useEffect(() => {
    if (!isMapAlive(map)) return
    if (!map.getSource(SRC)) {
      map.addSource(SRC, { type: 'geojson', data: toGeoJSON([]) })
    }
    // ✈ airplane symbol — clearly distinct from earthquake circles
    if (!map.getLayer(LYR_CIRCLE)) {
      map.addLayer({
        id: LYR_CIRCLE, type: 'symbol', source: SRC,
        layout: {
          'text-field':             '✈',
          'text-font':              ['Arial Unicode MS Bold', 'Open Sans Bold'],
          'text-size':              18,
          'text-allow-overlap':     true,
          'text-ignore-placement':  true,
          visibility: visible ? 'visible' : 'none',
        },
        paint: {
          'text-color':       '#00B4FF',
          'text-halo-color':  '#000A0F',
          'text-halo-width':  2,
          'text-opacity':     0.95,
        },
      })
    }
    if (!map.getLayer(LYR_LABEL)) {
      map.addLayer({
        id: LYR_LABEL, type: 'symbol', source: SRC,
        layout: {
          'text-field':  ['get', 'iataCode'],
          'text-size':   9,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          visibility: visible ? 'visible' : 'none',
        },
        paint: { 'text-color': '#00B4FF', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
      })
    }

    const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onLeave = () => { map.getCanvas().style.cursor = '' }
    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      const p = e.features[0].properties as { iataCode: string; icaoCode: string; name: string; country: string }
      const [lng, lat] = (e.features[0].geometry as GeoJSON.Point).coordinates
      onSelect?.({ type: 'airport', iata: p.iataCode, icao: p.icaoCode, name: p.name, country: p.country, lat, lng })
    }
    map.on('mouseenter', LYR_CIRCLE, onEnter)
    map.on('mouseleave', LYR_CIRCLE, onLeave)
    map.on('click', LYR_CIRCLE, onClick)

    return () => {
      map.off('mouseenter', LYR_CIRCLE, onEnter)
      map.off('mouseleave', LYR_CIRCLE, onLeave)
      map.off('click', LYR_CIRCLE, onClick)
      if (!isMapAlive(map)) return
      if (map.getLayer(LYR_LABEL))  map.removeLayer(LYR_LABEL)
      if (map.getLayer(LYR_CIRCLE)) map.removeLayer(LYR_CIRCLE)
      if (map.getSource(SRC))       map.removeSource(SRC)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  useEffect(() => {
    if (!isMapAlive(map) || !map.getSource(SRC)) return
    ;(map.getSource(SRC) as GeoJSONSource).setData(toGeoJSON(airports))
  }, [map, airports])

  useEffect(() => {
    if (!isMapAlive(map)) return
    const v = visible ? 'visible' : 'none'
    if (map.getLayer(LYR_CIRCLE)) map.setLayoutProperty(LYR_CIRCLE, 'visibility', v)
    if (map.getLayer(LYR_LABEL))  map.setLayoutProperty(LYR_LABEL, 'visibility', v)
  }, [map, visible])

  return null
}
