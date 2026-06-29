'use client'

import { useEffect } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'

export interface DamagePoint {
  id: string
  lat: number
  lng: number
  address: string
  damageType: 'collapsed' | 'damaged' | 'unknown'
  sarConfidence: number
  buildingType?: string
}

interface DamagePointsLayerProps {
  map: MapLibreMap
  points: DamagePoint[]
  visible: boolean
}

const SOURCE_ID  = 'damage-points'
const LAYER_FILL = 'damage-points-fill'
const LAYER_LABEL = 'damage-points-label'

// ── Building SVG icons ────────────────────────────────────────────────────────

function buildingSvg(fill: string, stroke: string, variant: 'collapsed' | 'damaged' | 'ok'): string {
  const cracks = variant === 'collapsed'
    ? `<line x1="9" y1="12" x2="13" y2="18" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"/>
       <line x1="13" y1="15" x2="17" y2="12" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"/>`
    : variant === 'damaged'
    ? `<line x1="11" y1="13" x2="13" y2="19" stroke="${stroke}" stroke-width="1.2" stroke-linecap="round"/>`
    : ''
  // X cross for fully collapsed
  const cross = variant === 'collapsed'
    ? `<line x1="4" y1="10" x2="20" y2="24" stroke="${stroke}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
       <line x1="20" y1="10" x2="4" y2="24" stroke="${stroke}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28">
  <!-- Roof -->
  <polygon points="12,1 1,10 23,10" fill="${fill}" opacity="0.95"/>
  <!-- Body -->
  <rect x="2" y="10" width="20" height="16" fill="${fill}" opacity="0.9" rx="0.5"/>
  <!-- Windows left col -->
  <rect x="4"  y="12" width="5" height="4" fill="#000A0F" opacity="0.45" rx="0.5"/>
  <rect x="4"  y="18" width="5" height="4" fill="#000A0F" opacity="0.45" rx="0.5"/>
  <!-- Windows right col -->
  <rect x="15" y="12" width="5" height="4" fill="#000A0F" opacity="0.45" rx="0.5"/>
  <rect x="15" y="18" width="5" height="4" fill="#000A0F" opacity="0.45" rx="0.5"/>
  <!-- Door -->
  <rect x="9" y="21" width="6" height="5" fill="#000A0F" opacity="0.5" rx="0.5"/>
  ${cross}
  ${cracks}
  <!-- Outline -->
  <polygon points="12,1 1,10 23,10" fill="none" stroke="#E0E8F0" stroke-width="0.6" opacity="0.6"/>
  <rect x="2" y="10" width="20" height="16" fill="none" stroke="#E0E8F0" stroke-width="0.6" opacity="0.6" rx="0.5"/>
</svg>`
}

async function ensureBuildingIcons(map: MapLibreMap): Promise<void> {
  const defs: Array<[string, string, string, 'collapsed' | 'damaged' | 'ok']> = [
    ['building-collapsed', '#FF4444', '#CC0000', 'collapsed'],
    ['building-damaged',   '#FFB800', '#CC8800', 'damaged'],
    ['building-unknown',   '#607080', '#405060', 'ok'],
  ]

  await Promise.all(defs.map(([name, fill, stroke, variant]) =>
    new Promise<void>(resolve => {
      if (map.hasImage(name)) { resolve(); return }
      const svg = buildingSvg(fill, stroke, variant)
      const img = new Image(24, 28)
      img.onload  = () => { if (isMapAlive(map) && !map.hasImage(name)) map.addImage(name, img); resolve() }
      img.onerror = () => resolve()
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    })
  ))
}

function toGeoJSON(points: DamagePoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        id:             p.id,
        address:        p.address,
        damageType:     p.damageType,
        sarConfidence:  p.sarConfidence,
        buildingType:   p.buildingType ?? 'unknown',
        confidencePct:  Math.round(p.sarConfidence * 100),
      },
    })),
  }
}

export default function DamagePointsLayer({ map, points, visible }: DamagePointsLayerProps) {
  useEffect(() => {
    if (!map) return
    const geojson = toGeoJSON(points)

    if (map.getSource(SOURCE_ID)) {
      (map.getSource(SOURCE_ID) as GeoJSONSource).setData(geojson)
      return
    }

    // Load icons then add source + layers
    ensureBuildingIcons(map).then(() => {
      if (!isMapAlive(map) || map.getSource(SOURCE_ID)) return

      map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })

      // Building icon symbol layer — same ID as before so click handlers keep working
      map.addLayer({
        id:     LAYER_FILL,
        type:   'symbol',
        source: SOURCE_ID,
        layout: {
          'icon-image': [
            'match', ['get', 'damageType'],
            'collapsed', 'building-collapsed',
            'damaged',   'building-damaged',
            /* default */ 'building-unknown',
          ],
          'icon-size': [
            'interpolate', ['linear'], ['get', 'sarConfidence'],
            0, 0.7, 1, 1.2,
          ],
          'icon-allow-overlap':    true,
          'icon-ignore-placement': true,
          'icon-anchor':           'bottom',
        },
        paint: {
          'icon-opacity': [
            'interpolate', ['linear'], ['get', 'sarConfidence'],
            0, 0.5, 1, 1.0,
          ],
        },
      })

      // Confidence % label (visible from zoom 12)
      map.addLayer({
        id:      LAYER_LABEL,
        type:    'symbol',
        source:  SOURCE_ID,
        minzoom: 12,
        layout: {
          'text-field':  ['concat', ['get', 'confidencePct'], '%'],
          'text-font':   ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size':   9,
          'text-offset': [0, 0.3],
          'text-anchor': 'top',
        },
        paint: {
          'text-color':       '#E0E8F0',
          'text-halo-color':  '#000A0F',
          'text-halo-width':  1.5,
        },
      })

      const vis = visible ? 'visible' : 'none'
      if (map.getLayer(LAYER_FILL))  map.setLayoutProperty(LAYER_FILL,  'visibility', vis)
      if (map.getLayer(LAYER_LABEL)) map.setLayoutProperty(LAYER_LABEL, 'visibility', vis)
    })

    return () => {
      if (!isMapAlive(map)) return
      if (map.getLayer(LAYER_LABEL)) map.removeLayer(LAYER_LABEL)
      if (map.getLayer(LAYER_FILL))  map.removeLayer(LAYER_FILL)
      if (map.getSource(SOURCE_ID))  map.removeSource(SOURCE_ID)
    }
  }, [map, points])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!map) return
    const vis = visible ? 'visible' : 'none'
    if (map.getLayer(LAYER_FILL))  map.setLayoutProperty(LAYER_FILL,  'visibility', vis)
    if (map.getLayer(LAYER_LABEL)) map.setLayoutProperty(LAYER_LABEL, 'visibility', vis)
  }, [map, visible])

  return null
}
