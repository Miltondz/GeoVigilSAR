'use client'

// Renders departure/arrival airport markers + route line for a selected flight.
// Visible only when an aircraft is selected and flightRoute has airport data.

import { useEffect } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import type { FlightRoute } from '@/lib/airports'
import type { AircraftState } from '@/lib/opensky'
import { countryFlag } from '@/lib/country-flags'
import { isMapAlive } from './mapUtils'

const SRC_AIRPORTS = 'flight-route-airports'
const SRC_LINE     = 'flight-route-line'
const LYR_APT_DOT  = 'flight-route-apt-dot'
const LYR_APT_LBL  = 'flight-route-apt-label'
const LYR_FLOWN    = 'flight-route-flown'
const LYR_PLANNED  = 'flight-route-planned'

function buildAirportsGeoJSON(flightRoute: FlightRoute): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  if (flightRoute.departure) {
    const a = flightRoute.departure
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      properties: {
        role:  'departure',
        iata:  a.iata ?? a.icao,
        name:  a.name,
        city:  a.city,
        flag:  countryFlag(a.country),
        label: `${countryFlag(a.country)} ${a.iata ?? a.icao}`,
      },
    })
  }
  if (flightRoute.arrival) {
    const a = flightRoute.arrival
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      properties: {
        role:  'arrival',
        iata:  a.iata ?? a.icao,
        name:  a.name,
        city:  a.city,
        flag:  countryFlag(a.country),
        label: `${countryFlag(a.country)} ${a.iata ?? a.icao}`,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function buildRouteLineGeoJSON(
  flightRoute: FlightRoute,
  currentPos: [number, number] | null,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  const dep = flightRoute.departure
  const arr = flightRoute.arrival
  const cur = currentPos

  // Flown segment: departure → current position
  if (dep && cur) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[dep.lng, dep.lat], cur] },
      properties: { segment: 'flown' },
    })
  }

  // Planned segment: current position → arrival
  if (arr && cur) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [cur, [arr.lng, arr.lat]] },
      properties: { segment: 'planned' },
    })
  }

  // If no current pos but both airports: draw full route as planned
  if (!cur && dep && arr) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[dep.lng, dep.lat], [arr.lng, arr.lat]] },
      properties: { segment: 'planned' },
    })
  }

  return { type: 'FeatureCollection', features }
}

interface FlightRouteLayerProps {
  map:          MapLibreMap
  flightRoute:  FlightRoute | null
  selectedIcao24: string | null
  aircraft:     AircraftState[]
  visible:      boolean
}

export default function FlightRouteLayer({
  map,
  flightRoute,
  selectedIcao24,
  aircraft,
  visible,
}: FlightRouteLayerProps) {

  // Setup sources + layers once on mount
  useEffect(() => {
    if (!isMapAlive(map)) return

    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

    if (!map.getSource(SRC_AIRPORTS)) {
      map.addSource(SRC_AIRPORTS, { type: 'geojson', data: empty })
    }
    if (!map.getSource(SRC_LINE)) {
      map.addSource(SRC_LINE, { type: 'geojson', data: empty })
    }

    // Airport dots
    if (!map.getLayer(LYR_APT_DOT)) {
      map.addLayer({
        id:     LYR_APT_DOT,
        type:   'circle',
        source: SRC_AIRPORTS,
        paint: {
          'circle-radius': 7,
          'circle-color': ['case', ['==', ['get', 'role'], 'departure'], '#00FF88', '#FFB800'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff',
        },
      })
    }

    // Airport labels (IATA + flag)
    if (!map.getLayer(LYR_APT_LBL)) {
      map.addLayer({
        id:     LYR_APT_LBL,
        type:   'symbol',
        source: SRC_AIRPORTS,
        layout: {
          'text-field':   ['get', 'label'],
          'text-size':    12,
          'text-offset':  [0, 1.4],
          'text-anchor':  'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color':       ['case', ['==', ['get', 'role'], 'departure'], '#00FF88', '#FFB800'],
          'text-halo-color':  'rgba(0,0,0,0.8)',
          'text-halo-width':  1.5,
        },
      })
    }

    // Flown route: solid cyan
    if (!map.getLayer(LYR_FLOWN)) {
      map.addLayer({
        id:     LYR_FLOWN,
        type:   'line',
        source: SRC_LINE,
        filter: ['==', ['get', 'segment'], 'flown'],
        paint: {
          'line-color':   '#00B4FF',
          'line-width':   1.5,
          'line-opacity': 0.6,
        },
        layout: { 'line-cap': 'round' },
      })
    }

    // Planned route: dashed amber
    if (!map.getLayer(LYR_PLANNED)) {
      map.addLayer({
        id:     LYR_PLANNED,
        type:   'line',
        source: SRC_LINE,
        filter: ['==', ['get', 'segment'], 'planned'],
        paint: {
          'line-color':      '#FFB800',
          'line-width':      1.5,
          'line-opacity':    0.5,
          'line-dasharray':  [3, 3],
        },
        layout: { 'line-cap': 'butt' },
      })
    }

    return () => {
      if (!isMapAlive(map)) return
      ;[LYR_APT_DOT, LYR_APT_LBL, LYR_FLOWN, LYR_PLANNED].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id)
      })
      ;[SRC_AIRPORTS, SRC_LINE].forEach(id => {
        if (map.getSource(id)) map.removeSource(id)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Update data when flightRoute or aircraft position changes
  useEffect(() => {
    if (!isMapAlive(map) || !map.getSource(SRC_AIRPORTS)) return

    if (!visible || !flightRoute) {
      const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
      ;(map.getSource(SRC_AIRPORTS) as GeoJSONSource).setData(empty)
      ;(map.getSource(SRC_LINE)     as GeoJSONSource).setData(empty)
      return
    }

    // Find current aircraft position
    const ac = selectedIcao24 ? aircraft.find(a => a.icao24 === selectedIcao24) : null
    const currentPos: [number, number] | null = ac?.longitude != null && ac?.latitude != null
      ? [ac.longitude, ac.latitude]
      : null

    ;(map.getSource(SRC_AIRPORTS) as GeoJSONSource).setData(buildAirportsGeoJSON(flightRoute))
    ;(map.getSource(SRC_LINE)     as GeoJSONSource).setData(buildRouteLineGeoJSON(flightRoute, currentPos))

    // Sync visibility
    const v = 'visible'
    ;[LYR_APT_DOT, LYR_APT_LBL, LYR_FLOWN, LYR_PLANNED].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v)
    })
  }, [map, flightRoute, selectedIcao24, aircraft, visible])

  // Hide layers when not visible
  useEffect(() => {
    if (!isMapAlive(map) || visible) return
    const n = 'none'
    ;[LYR_APT_DOT, LYR_APT_LBL, LYR_FLOWN, LYR_PLANNED].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', n)
    })
  }, [map, visible])

  return null
}
