'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import type { WeatherPoint } from '@/lib/open-meteo'
import { windDirArrow } from '@/lib/open-meteo'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import maplibregl from 'maplibre-gl'

const SRC       = 'weather-points'
const LYR_ARROW = 'weather-arrows'
const LYR_LABEL = 'weather-labels'

function toGeoJSON(points: WeatherPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: {
        windSpeed:   p.current.windSpeed10m,
        windDir:     p.current.windDirection10m,
        windGusts:   p.current.windGusts10m,
        temp:        p.current.temperature2m,
        precip:      p.current.precipitation,
        cloud:       p.current.cloudCover,
        wCode:       p.current.weatherCode,
        visibility:  p.current.visibility,
        // arrow points TOWARD, meteorological FROM → add 180°
        arrowRotate: (p.current.windDirection10m + 180) % 360,
        label:       `${windDirArrow(p.current.windDirection10m)} ${p.current.windSpeed10m.toFixed(1)}m/s`,
      },
    })),
  }
}

interface WeatherLayerProps {
  map: MapLibreMap
  points: WeatherPoint[]
  visible: boolean
  onSelect?: (obj: SelectedMapObject | null) => void
}

export default function WeatherLayer({ map, points, visible, onSelect }: WeatherLayerProps) {
  useEffect(() => {
    if (!isMapAlive(map)) return
    if (!map.getSource(SRC)) {
      map.addSource(SRC, { type: 'geojson', data: toGeoJSON([]) })
    }
    if (!map.getLayer(LYR_ARROW)) {
      map.addLayer({
        id: LYR_ARROW, type: 'circle', source: SRC,
        paint: {
          'circle-radius': ['+', 4, ['/', ['get', 'windSpeed'], 3]],
          'circle-color': ['case', ['>', ['get', 'precip'], 1], '#FFB800', '#00B4FF'], // amber rain, cyan wind
          'circle-opacity': 0.7,
          'circle-stroke-color': '#001A24',
          'circle-stroke-width': 1,
        },
        layout: { visibility: visible ? 'visible' : 'none' },
      })
    }
    if (!map.getLayer(LYR_LABEL)) {
      map.addLayer({
        id: LYR_LABEL, type: 'symbol', source: SRC,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-offset': [0, 1.8],
          'text-anchor': 'top',
          visibility: visible ? 'visible' : 'none',
        },
        paint: { 'text-color': '#00B4FF', 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 1.5 },
      })
    }

    const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onLeave = () => { map.getCanvas().style.cursor = '' }
    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      const p = e.features[0].properties as { windSpeed: number; windDir: number; windGusts: number; temp: number; precip: number; cloud: number; wCode: number; visibility: number | null }
      const [lng, lat] = (e.features[0].geometry as GeoJSON.Point).coordinates
      onSelect?.({ type: 'weather', lat, lng, windSpeed: p.windSpeed, windDir: p.windDir, windGusts: p.windGusts, temp: p.temp, precip: p.precip, cloudCover: p.cloud, weatherCode: p.wCode, visibility: p.visibility })
    }
    map.on('mouseenter', LYR_ARROW, onEnter)
    map.on('mouseleave', LYR_ARROW, onLeave)
    map.on('click', LYR_ARROW, onClick)

    return () => {
      map.off('mouseenter', LYR_ARROW, onEnter)
      map.off('mouseleave', LYR_ARROW, onLeave)
      map.off('click', LYR_ARROW, onClick)
      if (!isMapAlive(map)) return
      if (map.getLayer(LYR_LABEL))  map.removeLayer(LYR_LABEL)
      if (map.getLayer(LYR_ARROW))  map.removeLayer(LYR_ARROW)
      if (map.getSource(SRC))       map.removeSource(SRC)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  useEffect(() => {
    if (!isMapAlive(map) || !map.getSource(SRC)) return
    ;(map.getSource(SRC) as GeoJSONSource).setData(toGeoJSON(points))
  }, [map, points])

  useEffect(() => {
    if (!isMapAlive(map)) return
    const v = visible ? 'visible' : 'none'
    if (map.getLayer(LYR_ARROW)) map.setLayoutProperty(LYR_ARROW, 'visibility', v)
    if (map.getLayer(LYR_LABEL)) map.setLayoutProperty(LYR_LABEL, 'visibility', v)
  }, [map, visible])

  return null
}
