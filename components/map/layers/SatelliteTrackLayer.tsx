'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import type { SatellitePass, GroundTrackPoint } from '@/lib/orbits'

interface SatelliteTrackLayerProps {
  map: MapLibreMap
  passes: SatellitePass[]
  visible: boolean
}

const SOURCE_TRACK = 'satellite-tracks'
const SOURCE_POS = 'satellite-positions'
const LAYER_TRACK = 'satellite-track-line'
const LAYER_POS = 'satellite-position'

/**
 * Split ground track at antimeridian crossings to avoid horizontal map wrap lines.
 * Returns array of segment coordinate arrays.
 */
function splitAtAntimeridian(points: GroundTrackPoint[]): [number, number][][] {
  const segments: [number, number][][] = []
  let current: [number, number][] = []

  for (let i = 0; i < points.length; i++) {
    const pt = points[i]
    if (i > 0) {
      const prev = points[i - 1]
      if (Math.abs(pt.lng - prev.lng) > 180) {
        if (current.length > 1) segments.push(current)
        current = []
      }
    }
    current.push([pt.lng, pt.lat])
  }
  if (current.length > 1) segments.push(current)
  return segments
}

function buildTrackGeoJSON(passes: SatellitePass[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []

  for (const pass of passes) {
    const segments = splitAtAntimeridian(pass.groundTrack)
    for (const coords of segments) {
      features.push({
        type: 'Feature',
        properties: { name: pass.name, noradId: pass.noradId },
        geometry: { type: 'LineString', coordinates: coords },
      })
    }
  }

  return { type: 'FeatureCollection', features }
}

function buildPositionGeoJSON(passes: SatellitePass[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: passes
      .filter((p) => p.currentPosition !== null)
      .map((p) => ({
        type: 'Feature' as const,
        properties: {
          name: p.name,
          noradId: p.noradId,
          altitudeKm: p.currentPosition!.altitudeKm.toFixed(1),
          orbitClass: p.orbitClass,
          nextWindowStart: p.nextCaptureWindow?.startMs ?? null,
          nextWindowEnd: p.nextCaptureWindow?.endMs ?? null,
          maxElevDeg: p.nextCaptureWindow?.maxElevationDeg.toFixed(1) ?? null,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [p.currentPosition!.lng, p.currentPosition!.lat],
        },
      })),
  }
}

export default function SatelliteTrackLayer({ map, passes, visible }: SatelliteTrackLayerProps) {
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!map) return

    const trackGJ = buildTrackGeoJSON(passes)
    const posGJ = buildPositionGeoJSON(passes)

    // Track line source + layer
    if (map.getSource(SOURCE_TRACK)) {
      (map.getSource(SOURCE_TRACK) as GeoJSONSource).setData(trackGJ)
    } else {
      map.addSource(SOURCE_TRACK, { type: 'geojson', data: trackGJ })
      map.addLayer({
        id: LAYER_TRACK,
        type: 'line',
        source: SOURCE_TRACK,
        paint: {
          'line-color': '#00B4FF',
          'line-width': 1.5,
          'line-opacity': 0.7,
          'line-dasharray': [4, 2],
        },
      })
    }

    // Position marker source + layer
    if (map.getSource(SOURCE_POS)) {
      (map.getSource(SOURCE_POS) as GeoJSONSource).setData(posGJ)
    } else {
      map.addSource(SOURCE_POS, { type: 'geojson', data: posGJ })
      map.addLayer({
        id: LAYER_POS,
        type: 'circle',
        source: SOURCE_POS,
        paint: {
          'circle-radius': 6,
          'circle-color': '#00FF88',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#00B4FF',
          'circle-opacity': 0.9,
        },
      })

      // Popup on click
      map.on('click', LAYER_POS, (e) => {
        if (!e.features?.length) return
        const props = e.features[0].properties as {
          name: string; noradId: number; altitudeKm: string
          orbitClass: string; nextWindowStart: number | null
          nextWindowEnd: number | null; maxElevDeg: string | null
        }
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]

        let windowLine = 'Sin pase próximo'
        if (props.nextWindowStart) {
          const startDate = new Date(props.nextWindowStart)
          const durationMin = props.nextWindowEnd
            ? Math.round((props.nextWindowEnd - props.nextWindowStart) / 60000)
            : 0
          windowLine = `${startDate.toUTCString().slice(17, 22)} UTC · ${durationMin}min · ${props.maxElevDeg ?? '?'}° elev`
        }

        popupRef.current?.remove()
        popupRef.current = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          className: 'sat-popup',
        })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:var(--font-hud,'Share Tech Mono',monospace);font-size:0.625rem;color:var(--color-text,#E0E8F0);background:var(--color-panel,#001A24);border:1px solid var(--color-slate,#1A3A4A);padding:0.5rem;min-width:160px">
              <div style="color:var(--color-cyan,#00B4FF);letter-spacing:0.15em;margin-bottom:0.25rem">${props.name}</div>
              <div>NORAD: ${props.noradId}</div>
              <div>ALT: ${props.altitudeKm} km</div>
              <div>ÓRBITA: ${props.orbitClass}</div>
              <div style="color:var(--color-amber,#FFB800);margin-top:0.25rem">VENTANA SAR:</div>
              <div>${windowLine}</div>
            </div>`,
          )
          .addTo(map)
      })

      map.on('mouseenter', LAYER_POS, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', LAYER_POS, () => {
        map.getCanvas().style.cursor = ''
      })
    }

    // Sync visibility
    const vis = visible ? 'visible' : 'none'
    if (map.getLayer(LAYER_TRACK)) map.setLayoutProperty(LAYER_TRACK, 'visibility', vis)
    if (map.getLayer(LAYER_POS)) map.setLayoutProperty(LAYER_POS, 'visibility', vis)

    return () => {
      popupRef.current?.remove()
      if (!isMapAlive(map)) return
      if (map.getLayer(LAYER_POS)) map.removeLayer(LAYER_POS)
      if (map.getLayer(LAYER_TRACK)) map.removeLayer(LAYER_TRACK)
      if (map.getSource(SOURCE_POS)) map.removeSource(SOURCE_POS)
      if (map.getSource(SOURCE_TRACK)) map.removeSource(SOURCE_TRACK)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, passes])

  // Sync visibility without remount
  useEffect(() => {
    if (!map) return
    const vis = visible ? 'visible' : 'none'
    if (map.getLayer(LAYER_TRACK)) map.setLayoutProperty(LAYER_TRACK, 'visibility', vis)
    if (map.getLayer(LAYER_POS)) map.setLayoutProperty(LAYER_POS, 'visibility', vis)
  }, [map, visible])

  return null
}
