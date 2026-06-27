'use client'

import { useEffect } from 'react'
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'

interface EMSR884LayerProps {
  map: MapLibreMap
  visible: boolean
}

const SOURCE_ID = 'emsr884-aois'
const FILL_ID = 'emsr884-fill'
const OUTLINE_ID = 'emsr884-outline'
const LABEL_ID = 'emsr884-labels'

export default function EMSR884Layer({ map, visible }: EMSR884LayerProps) {
  useEffect(() => {
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: '/geojson/EMSR884_aois.json',
      })
    }

    if (!map.getLayer(FILL_ID)) {
      map.addLayer({
        id: FILL_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': '#FF4444',
          'fill-opacity': 0.08,
        },
      })
    }

    if (!map.getLayer(OUTLINE_ID)) {
      map.addLayer({
        id: OUTLINE_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': '#FF4444',
          'line-width': 1.5,
          'line-dasharray': [4, 2],
          'line-opacity': 0.85,
        },
      })
    }

    if (!map.getLayer(LABEL_ID)) {
      map.addLayer({
        id: LABEL_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 9,
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#FF4444',
          'text-halo-color': '#000A0F',
          'text-halo-width': 1.5,
          'text-opacity': 0.9,
        },
      })
    }

    const vis = visible ? 'visible' : 'none'
    for (const id of [FILL_ID, OUTLINE_ID, LABEL_ID]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
    })

    const onMouseEnter = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!visible) return
      map.getCanvas().style.cursor = 'pointer'
      const feature = e.features?.[0]
      if (!feature) return
      const name = (feature.properties?.name as string) ?? ''
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-family:monospace;font-size:11px;color:#FF4444;background:#000A0F;padding:6px 8px;border:1px solid #FF4444;border-radius:2px">
            <div style="color:#E0E8F0;font-weight:bold">${name}</div>
            <div style="color:#607080;margin-top:2px">EMSR884 — Copernicus EMS</div>
          </div>`
        )
        .addTo(map)
    }

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = ''
      popup.remove()
    }

    map.on('mouseenter', FILL_ID, onMouseEnter)
    map.on('mouseleave', FILL_ID, onMouseLeave)

    return () => {
      if (!isMapAlive(map)) return
      map.off('mouseenter', FILL_ID, onMouseEnter)
      map.off('mouseleave', FILL_ID, onMouseLeave)
      popup.remove()
      for (const id of [LABEL_ID, OUTLINE_ID, FILL_ID]) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, visible])

  return null
}
