'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'

interface SARTile {
  url: string
  bounds: [number, number, number, number]  // [west, south, east, north]
  phase: 'pre' | 'post'
  date: string
}

interface SARLayerProps {
  map: MapLibreMap
  tiles: SARTile[]
  visible: boolean
  opacity?: number
}

export default function SARLayer({ map, tiles, visible, opacity = 0.7 }: SARLayerProps) {
  useEffect(() => {
    const layers: string[] = []
    const sources: string[] = []

    tiles.forEach((tile, i) => {
      const sourceId = `sar-${tile.phase}-${i}`
      const layerId = `sar-layer-${tile.phase}-${i}`
      sources.push(sourceId)
      layers.push(layerId)

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'image',
          url: tile.url,
          coordinates: [
            [tile.bounds[0], tile.bounds[3]],  // NW
            [tile.bounds[2], tile.bounds[3]],  // NE
            [tile.bounds[2], tile.bounds[1]],  // SE
            [tile.bounds[0], tile.bounds[1]],  // SW
          ],
        })
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': opacity,
            'raster-fade-duration': 300,
          },
        })
      }
    })

    const visibility = visible ? 'visible' : 'none'
    layers.forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility)
    })

    return () => {
      if (!isMapAlive(map)) return
      layers.forEach(id => { if (map.getLayer(id)) map.removeLayer(id) })
      sources.forEach(id => { if (map.getSource(id)) map.removeSource(id) })
    }
  }, [map, tiles, visible, opacity])

  return null
}
