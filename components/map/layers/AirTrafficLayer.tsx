'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { isMapAlive } from './mapUtils'
import { registerAircraftIcons, categoryToIcon } from './aircraftIcons'
import type { AircraftState } from '@/lib/opensky'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import { countryIso2 } from '@/lib/country-flags'
import { inferFlightRoute } from '@/lib/flight-route-infer'

// Max trail points per aircraft (60s poll × 15 = 15 min of history)
const TRAIL_MAX = 15

const SRC_POINTS  = 'air-traffic'
const SRC_TRAILS  = 'air-traffic-trails'
const SRC_ROUTES  = 'air-traffic-routes'
const LYR_TRAILS  = 'air-traffic-trails-line'
const LYR_ROUTES  = 'air-traffic-routes-line'
const LYR_ICONS   = 'air-traffic-symbols'
const LYR_LABELS  = 'air-traffic-labels'

interface AirTrafficLayerProps {
  map: MapLibreMap
  aircraft: AircraftState[]
  visible: boolean
  onSelect?: (obj: SelectedMapObject | null) => void
}

function buildPointsGeoJSON(aircraft: AircraftState[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: aircraft
      .filter(a => a.longitude !== null && a.latitude !== null)
      .map(a => {
        const iso2 = countryIso2(a.originCountry)
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [a.longitude!, a.latitude!] },
          properties: {
            icao24:        a.icao24,
            callsign:      a.callsign ?? a.icao24,
            heading:       a.heading ?? 0,
            baroAltitude:  a.baroAltitude,
            velocity:      a.velocity,
            verticalRate:  a.verticalRate,
            category:      a.category,
            originCountry: a.originCountry,
            countryCode:   iso2 || a.originCountry.slice(0, 2).toUpperCase(),
            onGround:      a.onGround,
            lastContact:   a.lastContact,
            icon:          categoryToIcon(a.category),
          },
        }
      }),
  }
}

function buildTrailsGeoJSON(trails: Map<string, [number, number][]>): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = Array.from(trails.entries())
    .filter(([, pts]) => pts.length >= 2)
    .map(([icao24, pts]) => ({
      type: 'Feature' as const,
      id: icao24,
      geometry: { type: 'LineString' as const, coordinates: pts },
      properties: { icao24 },
    }))
  return { type: 'FeatureCollection', features }
}

function buildRoutesGeoJSON(aircraft: AircraftState[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const ac of aircraft) {
    if (ac.onGround || ac.longitude == null || ac.latitude == null || ac.heading == null) continue
    const { departure, arrival } = inferFlightRoute(ac)
    if (!departure || !arrival) continue
    features.push({
      type: 'Feature',
      id: ac.icao24,
      geometry: {
        type: 'LineString',
        coordinates: [
          [departure.lng, departure.lat],
          [ac.longitude,  ac.latitude],
          [arrival.lng,   arrival.lat],
        ],
      },
      properties: { icao24: ac.icao24 },
    })
  }
  return { type: 'FeatureCollection', features }
}

export default function AirTrafficLayer({ map, aircraft, visible, onSelect }: AirTrafficLayerProps) {
  const iconsReadyRef = useRef(false)
  const trailsRef     = useRef<Map<string, [number, number][]>>(new Map())
  const selectedRef   = useRef<string | null>(null)
  const onSelectRef   = useRef(onSelect)
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // ── Setup: register icons, add sources + layers once ────────────────────
  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      await registerAircraftIcons(map)
      if (cancelled || !isMapAlive(map)) return
      iconsReadyRef.current = true

      const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

      if (!map.getSource(SRC_POINTS)) {
        map.addSource(SRC_POINTS, { type: 'geojson', data: buildPointsGeoJSON([]) })
      }
      if (!map.getSource(SRC_TRAILS)) {
        map.addSource(SRC_TRAILS, { type: 'geojson', data: empty, promoteId: 'icao24' })
      }
      if (!map.getSource(SRC_ROUTES)) {
        map.addSource(SRC_ROUTES, { type: 'geojson', data: empty, promoteId: 'icao24' })
      }

      // Route lines — all aircraft, dim; selected = bright
      if (!map.getLayer(LYR_ROUTES)) {
        map.addLayer({
          id:     LYR_ROUTES,
          type:   'line',
          source: SRC_ROUTES,
          paint: {
            'line-color':   '#00B4FF',
            'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.85, 0.15],
            'line-width':   ['case', ['boolean', ['feature-state', 'selected'], false], 2.0, 0.6],
            'line-dasharray': [6, 3],
          },
          layout: { 'line-cap': 'round', 'line-join': 'round', visibility: visible ? 'visible' : 'none' },
        })
      }

      // Trail lines
      if (!map.getLayer(LYR_TRAILS)) {
        map.addLayer({
          id:     LYR_TRAILS,
          type:   'line',
          source: SRC_TRAILS,
          paint: {
            'line-color':   '#00B4FF',
            'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.85, 0.18],
            'line-width':   ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 0.8],
            'line-blur':    0.4,
          },
          layout: { 'line-cap': 'round', 'line-join': 'round', visibility: visible ? 'visible' : 'none' },
        })
      }

      // Aircraft icons
      if (!map.getLayer(LYR_ICONS)) {
        map.addLayer({
          id:     LYR_ICONS,
          type:   'symbol',
          source: SRC_POINTS,
          layout: {
            'icon-image':              ['get', 'icon'],
            'icon-rotate':             ['get', 'heading'],
            'icon-rotation-alignment': 'map',
            'icon-size':               0.8,
            'icon-allow-overlap':      true,
            'visibility':              visible ? 'visible' : 'none',
          },
        })
      }

      // Label: ISO2 code + callsign (MapLibre canvas cannot render flag emoji)
      if (!map.getLayer(LYR_LABELS)) {
        map.addLayer({
          id:     LYR_LABELS,
          type:   'symbol',
          source: SRC_POINTS,
          layout: {
            'text-field':         ['concat', '[', ['get', 'countryCode'], '] ', ['get', 'callsign']],
            'text-size':          10,
            'text-offset':        [0, 1.5],
            'text-anchor':        'top',
            'text-allow-overlap': false,
            'visibility':         visible ? 'visible' : 'none',
          },
          paint: {
            'text-color':      '#00B4FF',
            'text-halo-color': 'rgba(0,0,0,0.85)',
            'text-halo-width': 1.5,
          },
        })
      }

      // Hover cursor
      const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
      const onLeave = () => { map.getCanvas().style.cursor = '' }
      map.on('mouseenter', LYR_ICONS, onEnter)
      map.on('mouseleave', LYR_ICONS, onLeave)

      // Click → onSelect + highlight route + trail
      const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return
        const p = e.features[0].properties as {
          icao24: string; callsign: string; baroAltitude: number | null
          velocity: number | null; heading: number | null; verticalRate: number | null
          onGround: boolean; originCountry: string; category: string; lastContact: number
        }
        const geo = e.features[0].geometry as GeoJSON.Point

        const prev = selectedRef.current
        if (prev && prev !== p.icao24) {
          if (map.getSource(SRC_TRAILS)) map.setFeatureState({ source: SRC_TRAILS, id: prev }, { selected: false })
          if (map.getSource(SRC_ROUTES)) map.setFeatureState({ source: SRC_ROUTES, id: prev }, { selected: false })
        }
        selectedRef.current = p.icao24
        if (map.getSource(SRC_TRAILS)) map.setFeatureState({ source: SRC_TRAILS, id: p.icao24 }, { selected: true })
        if (map.getSource(SRC_ROUTES)) map.setFeatureState({ source: SRC_ROUTES, id: p.icao24 }, { selected: true })

        onSelectRef.current?.({
          type:          'aircraft',
          icao24:        p.icao24,
          callsign:      p.callsign,
          lat:           geo.coordinates[1],
          lng:           geo.coordinates[0],
          baroAltitude:  p.baroAltitude,
          velocity:      p.velocity,
          heading:       p.heading,
          verticalRate:  p.verticalRate,
          onGround:      p.onGround === true || (p.onGround as unknown) === 'true',
          originCountry: p.originCountry,
          category:      p.category,
          lastContact:   p.lastContact,
        })
      }
      map.on('click', LYR_ICONS, onClick)

      return () => {
        map.off('mouseenter', LYR_ICONS, onEnter)
        map.off('mouseleave', LYR_ICONS, onLeave)
        map.off('click', LYR_ICONS, onClick)
      }
    }

    void setup()

    return () => {
      cancelled = true
      if (!isMapAlive(map)) return
      ;[LYR_LABELS, LYR_ICONS, LYR_TRAILS, LYR_ROUTES].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id)
      })
      ;[SRC_POINTS, SRC_TRAILS, SRC_ROUTES].forEach(id => {
        if (map.getSource(id)) map.removeSource(id)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // ── Update data on each poll ─────────────────────────────────────────────
  useEffect(() => {
    if (!isMapAlive(map) || !map.getSource(SRC_POINTS)) return

    const trails    = trailsRef.current
    const activeIds = new Set(aircraft.map(a => a.icao24))

    // Prune stale trails
    Array.from(trails.keys()).forEach(id => { if (!activeIds.has(id)) trails.delete(id) })

    // Append new positions to trails
    for (const a of aircraft) {
      if (a.longitude === null || a.latitude === null) continue
      const pt: [number, number] = [a.longitude, a.latitude]
      const existing = trails.get(a.icao24)
      if (!existing) {
        trails.set(a.icao24, [pt])
      } else {
        const last = existing[existing.length - 1]
        if (last[0] !== pt[0] || last[1] !== pt[1]) {
          existing.push(pt)
          if (existing.length > TRAIL_MAX) existing.shift()
        }
      }
    }

    ;(map.getSource(SRC_POINTS) as GeoJSONSource).setData(buildPointsGeoJSON(aircraft))

    if (map.getSource(SRC_TRAILS)) {
      ;(map.getSource(SRC_TRAILS) as GeoJSONSource).setData(buildTrailsGeoJSON(trails))
      if (selectedRef.current) {
        map.setFeatureState({ source: SRC_TRAILS, id: selectedRef.current }, { selected: true })
      }
    }

    if (map.getSource(SRC_ROUTES)) {
      ;(map.getSource(SRC_ROUTES) as GeoJSONSource).setData(buildRoutesGeoJSON(aircraft))
      if (selectedRef.current) {
        map.setFeatureState({ source: SRC_ROUTES, id: selectedRef.current }, { selected: true })
      }
    }
  }, [map, aircraft])

  // ── Sync visibility ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMapAlive(map)) return
    const v = visible ? 'visible' : 'none'
    ;[LYR_LABELS, LYR_ICONS, LYR_TRAILS, LYR_ROUTES].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v)
    })
  }, [map, visible])

  return null
}
