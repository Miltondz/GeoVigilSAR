'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import type { VtProductLayer } from '@/lib/emsr884'
import { layerFillColor } from '@/lib/emsr884'

interface EMSR884ProductsLayerProps {
  map: MapLibreMap
  vtLayers: VtProductLayer[]
  visible: boolean
}

// Standard Copernicus EMS source-layer candidates for earthquake products
const COMMON_SOURCE_LAYERS = [
  'BUA_P',
  'OBJ_POLY',
  'GRD_POLY',
  'DAMAGE_OBJ_POLY',
  'AoI_POLY',
  'AffectedArea',
]

export default function EMSR884ProductsLayer({ map, vtLayers, visible }: EMSR884ProductsLayerProps) {
  const addedRef = useRef<{ sources: string[]; layers: string[] }>({ sources: [], layers: [] })

  useEffect(() => {
    if (vtLayers.length === 0) return

    const added = addedRef.current
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
    type LayerEventKey = 'mouseenter' | 'mouseleave'
    const handlers: Array<{ event: LayerEventKey; layer: string; fn: (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => void }> = []

    for (const vt of vtLayers) {
      const sourceId = `emsr884-vt-${vt.id}`

      if (!map.getSource(sourceId)) {
        try {
          map.addSource(sourceId, {
            type: 'vector',
            tiles: [vt.tileUrl],
            minzoom: 6,
            maxzoom: 18,
            attribution: '© Copernicus EMS EMSR884',
          })
          added.sources.push(sourceId)
        } catch { /* source may already exist */ }
      }

      // Try each common source-layer name — MapLibre renders nothing if source-layer absent
      const candidates = COMMON_SOURCE_LAYERS.includes(vt.layerName)
        ? [vt.layerName]
        : [vt.layerName, ...COMMON_SOURCE_LAYERS]

      const fillColor = layerFillColor(vt.layerName)

      for (const sl of candidates) {
        const fillId   = `emsr884-vt-fill-${vt.id}-${sl}`
        const strokeId = `emsr884-vt-stroke-${vt.id}-${sl}`

        if (!map.getLayer(fillId)) {
          try {
            map.addLayer({
              id: fillId,
              type: 'fill',
              source: sourceId,
              'source-layer': sl,
              paint: {
                'fill-color': [
                  'case',
                  ['==', ['get', 'Damage'], 'Destroyed'],            '#E0170B',
                  ['==', ['get', 'Damage'], 'Heavily Damaged'],      '#F5830C',
                  ['==', ['get', 'Damage'], 'Moderately Damaged'],   '#FFEB00',
                  ['==', ['get', 'Damage'], 'Slightly Damaged'],     '#AED9A3',
                  ['==', ['get', 'Damage'], 'Not Affected'],         '#1E9C3B',
                  // fallback generic color by layer type
                  fillColor,
                ],
                'fill-opacity': 0.65,
              },
            })
            added.layers.push(fillId)
          } catch { /* layer may already exist */ }
        }

        if (!map.getLayer(strokeId)) {
          try {
            map.addLayer({
              id: strokeId,
              type: 'line',
              source: sourceId,
              'source-layer': sl,
              paint: {
                'line-color': fillColor,
                'line-width': 0.8,
                'line-opacity': 0.5,
              },
            })
            added.layers.push(strokeId)
          } catch { /* layer may already exist */ }
        }

        // Hover popup for fill layer
        const onEnter = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (!visible) return
          map.getCanvas().style.cursor = 'pointer'
          const f = e.features?.[0]
          if (!f) return
          const props = f.properties ?? {}
          const damage  = (props['Damage'] as string | undefined) ?? ''
          const obj     = (props['obj_type'] as string | undefined) ?? ''
          popup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family:monospace;font-size:11px;color:#E0E8F0;background:#001A24;padding:6px 8px;border:1px solid #FF4444;border-radius:2px;min-width:160px">
                <div style="color:#FF4444;font-size:10px;letter-spacing:.1em;margin-bottom:4px">
                  EMSR884 — ${vt.productType}
                </div>
                <div style="color:#607080;font-size:10px">${vt.aoiName}</div>
                ${damage ? `<div style="margin-top:4px"><span style="color:#607080">Daño: </span><span style="color:#FFB800">${damage}</span></div>` : ''}
                ${obj    ? `<div><span style="color:#607080">Tipo: </span>${obj}</div>` : ''}
              </div>
            `)
            .addTo(map)
        }
        const onLeave = () => {
          map.getCanvas().style.cursor = ''
          popup.remove()
        }
        map.on('mouseenter', fillId, onEnter)
        map.on('mouseleave', fillId, onLeave)
        handlers.push({ event: 'mouseenter', layer: fillId, fn: onEnter })
        handlers.push({ event: 'mouseleave', layer: fillId, fn: onLeave })
      }
    }

    // Set initial visibility
    const vis = visible ? 'visible' : 'none'
    for (const id of added.layers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }

    return () => {
      if (!isMapAlive(map)) return
      popup.remove()
      for (const { event, layer, fn } of handlers) {
        map.off(event, layer, fn)
      }
      for (const id of [...added.layers].reverse()) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      for (const id of added.sources) {
        if (map.getSource(id)) map.removeSource(id)
      }
      added.sources = []
      added.layers  = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, vtLayers])

  // Toggle visibility without remounting
  useEffect(() => {
    if (!isMapAlive(map)) return
    const vis = visible ? 'visible' : 'none'
    for (const id of addedRef.current.layers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }
  }, [map, visible])

  return null
}
