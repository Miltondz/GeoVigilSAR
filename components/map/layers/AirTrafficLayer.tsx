'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import { registerAircraftIcons, categoryToIcon } from './aircraftIcons'
import type { AircraftState } from '@/lib/opensky'

// TODO (future): dead-reckoning interpolation between 30 s polling intervals
// using heading + velocity to smooth icon positions client-side.

interface AirTrafficLayerProps {
  map: MapLibreMap
  aircraft: AircraftState[]
  visible: boolean
}

const SOURCE_ID = 'air-traffic'
const LAYER_ID  = 'air-traffic-symbols'

function buildGeoJSON(aircraft: AircraftState[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = aircraft
    .filter(a => a.longitude !== null && a.latitude !== null)
    .map(a => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [a.longitude as number, a.latitude as number],
      },
      properties: {
        icao24:       a.icao24,
        callsign:     a.callsign ?? a.icao24,
        heading:      a.heading ?? 0,
        baroAltitude: a.baroAltitude,
        velocity:     a.velocity,
        category:     a.category,
        originCountry:a.originCountry,
        onGround:     a.onGround,
        icon:         categoryToIcon(a.category),
      },
    }))

  return { type: 'FeatureCollection', features }
}

export default function AirTrafficLayer({ map, aircraft, visible }: AirTrafficLayerProps) {
  const popupRef       = useRef<maplibregl.Popup | null>(null)
  const iconsReadyRef  = useRef(false)

  // Register icons + set up source/layer on mount
  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      await registerAircraftIcons(map)
      if (cancelled || !isMapAlive(map)) return

      iconsReadyRef.current = true
      const geojson = buildGeoJSON(aircraft)

      if (map.getSource(SOURCE_ID)) {
        ;(map.getSource(SOURCE_ID) as GeoJSONSource).setData(geojson)
      } else {
        map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })

        map.addLayer({
          id: LAYER_ID,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            'icon-image':                ['get', 'icon'],
            'icon-rotate':               ['get', 'heading'],
            'icon-rotation-alignment':   'map',
            'icon-size':                 0.8,
            'icon-allow-overlap':        true,
            'visibility':                visible ? 'visible' : 'none',
          },
        })
      }

      // Sync visibility after source is added
      if (map.getLayer(LAYER_ID)) {
        map.setLayoutProperty(LAYER_ID, 'visibility', visible ? 'visible' : 'none')
      }

      // Click popup
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        className: 'air-traffic-popup',
      })
      popupRef.current = popup

      const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return
        const props = e.features[0].properties as {
          callsign: string
          baroAltitude: number | null
          velocity: number | null
          category: string
          originCountry: string
          onGround: boolean
        }

        const altStr  = props.baroAltitude != null ? `${Math.round(props.baroAltitude)} m` : '—'
        const velStr  = props.velocity      != null ? `${Math.round(props.velocity)} m/s`  : '—'
        const groundStr = props.onGround ? ' · EN TIERRA' : ''

        const html = `
          <div style="
            font-family:'Share Tech Mono',monospace;
            font-size:0.6rem;
            color:var(--color-text,#E0E8F0);
            background:var(--color-panel,#001A24);
            border:1px solid var(--color-slate,#1A3A4A);
            padding:0.5rem 0.625rem;
            line-height:1.7;
            letter-spacing:0.05em;
            min-width:140px;
          ">
            <div style="color:var(--color-cyan,#00B4FF);font-size:0.65rem;letter-spacing:0.15em;margin-bottom:0.25rem;">
              ${props.callsign}${groundStr}
            </div>
            <div>ALT: ${altStr}</div>
            <div>VEL: ${velStr}</div>
            <div>CAT: ${props.category}</div>
            <div style="color:var(--color-muted,#607080)">${props.originCountry}</div>
          </div>
        `

        popup.setLngLat(e.lngLat).setHTML(html).addTo(map)
      }

      map.on('click', LAYER_ID, onClick)

      return () => {
        map.off('click', LAYER_ID, onClick)
      }
    }

    void setup()

    return () => {
      cancelled = true
      popupRef.current?.remove()

      if (!isMapAlive(map)) return
      if (map.getLayer(LAYER_ID))  map.removeLayer(LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Update data when aircraft list changes (polling)
  useEffect(() => {
    if (!isMapAlive(map)) return
    if (!map.getSource(SOURCE_ID)) return
    ;(map.getSource(SOURCE_ID) as GeoJSONSource).setData(buildGeoJSON(aircraft))
  }, [map, aircraft])

  // Sync visibility toggle
  useEffect(() => {
    if (!isMapAlive(map)) return
    if (!map.getLayer(LAYER_ID)) return
    map.setLayoutProperty(LAYER_ID, 'visibility', visible ? 'visible' : 'none')
  }, [map, visible])

  return null
}
