'use client'

import { useEffect, useRef, useState } from 'react'
import type { Viewer as CesiumViewer, Entity as CesiumEntity } from 'cesium'

// Boconó-Morón-El Pilar fault system coordinates [lng, lat, lng, lat, ...]
// Duplicated from FaultLinesLayer to avoid cross-tree imports
const FAULT_SEGMENTS: number[][] = [
  // Falla Boconó
  [-74.0, 7.8, -73.0, 8.2, -72.0, 8.5, -71.0, 9.0,
    -70.0, 9.5, -69.5, 9.8, -68.7, 10.2, -68.0, 10.4],
  // Falla Morón
  [-68.0, 10.4, -67.5, 10.5, -67.0, 10.6, -66.5, 10.6,
    -66.0, 10.7, -65.5, 10.7],
  // Falla El Pilar
  [-65.5, 10.7, -65.0, 10.7, -64.5, 10.6, -64.0, 10.5,
    -63.5, 10.4, -63.0, 10.3, -62.5, 10.2, -61.5, 10.1],
]

const WAVE_PERIOD_S  = 30
const WAVE_MAX_RADIUS = 800_000 // metres
const IMPACT_RADIUS   = 100_000 // metres

// Declare CESIUM_BASE_URL on window so we can set it before the dynamic import
declare global {
  interface Window {
    CESIUM_BASE_URL: string
  }
}

// Cesium Color equivalents — CSS variables can't be used in a WebGL context.
// Values mirror the project's CSS design tokens exactly.
const C_RED   = '#FF4444'  // --color-red
const C_AMBER = '#FFB800'  // --color-amber
const C_GREEN = '#00FF88'  // --color-green
const C_BG    = '#000A0F'  // --color-bg

export interface EarthquakeMarker {
  id: string
  magnitude: number
  lat: number
  lng: number
  depth: number
  place?: string
  time?: number
}

interface Cesium3DGlobeProps {
  epicenter: { lat: number; lng: number }
  earthquakes: EarthquakeMarker[]
  visible: boolean
  satellite?: boolean
  activeLayers?: Record<string, boolean>
}

export default function Cesium3DGlobe({
  epicenter,
  earthquakes,
  visible,
  satellite = false,
  activeLayers = {},
}: Cesium3DGlobeProps) {
  const containerRef      = useRef<HTMLDivElement>(null)
  const viewerRef         = useRef<CesiumViewer | null>(null)
  const mainshockEntitiesRef = useRef<CesiumEntity[]>([]) // M≥6.5 mainshock markers
  const aftershockEntitiesRef = useRef<CesiumEntity[]>([]) // M<6.5 aftershock markers
  const entitiesRef          = useRef<CesiumEntity[]>([])  // all earthquake entities (for cleanup)
  const faultEntitiesRef     = useRef<CesiumEntity[]>([])  // fault polylines
  const impactEntitiesRef    = useRef<CesiumEntity[]>([])  // cone + wave pulse
  const earthquakesRef    = useRef<EarthquakeMarker[]>([])
  const [cesiumReady, setCesiumReady] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [selectedEq, setSelectedEq]   = useState<EarthquakeMarker | null>(null)

  // ── Init Cesium once on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false

    const init = async () => {
      try {
        // CESIUM_BASE_URL MUST be set before the first Cesium import so that
        // web worker scripts resolve from public/cesium/Workers/.
        window.CESIUM_BASE_URL =
          process.env.NEXT_PUBLIC_CESIUM_BASE_URL ?? '/cesium'

        const CesiumLib = await import('cesium')
        if (cancelled || !containerRef.current) return

        // Suppress Ion token warning — no Ion services are used.
        CesiumLib.Ion.defaultAccessToken =
          process.env.NEXT_PUBLIC_CESIUM_TOKEN ?? ''

        const viewer = new CesiumLib.Viewer(containerRef.current, {
          // CARTO Dark Matter — dark basemap matching HUD theme, no API key needed
          baseLayer: new CesiumLib.ImageryLayer(
            new CesiumLib.UrlTemplateImageryProvider({
              url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              credit: '© OpenStreetMap contributors © CARTO',
              maximumLevel: 19,
            })
          ),
          // EllipsoidTerrainProvider (flat, free) is the Cesium default;
          // omitting terrainProvider uses it automatically.
          animation:            false,
          timeline:             false,
          geocoder:             false,
          homeButton:           false,
          sceneModePicker:      false,
          baseLayerPicker:      false,
          navigationHelpButton: false,
          infoBox:              false,
          selectionIndicator:   false,
          fullscreenButton:     false,
          vrButton:             false,
          skyAtmosphere:        false,
        })

        // Dark background to match HUD theme
        viewer.scene.backgroundColor =
          CesiumLib.Color.fromCssColorString(C_BG)

        // Fly to damage zone (La Guaira/Caracas corridor) at 60 km for city-level view
        viewer.camera.flyTo({
          destination: CesiumLib.Cartesian3.fromDegrees(-66.93, 10.52, 60_000),
          duration: 0,
        })

        // Click handler — show HUD popup for selected earthquake marker
        const handler = new CesiumLib.ScreenSpaceEventHandler(viewer.scene.canvas)
        handler.setInputAction((evt: { position: { x: number; y: number } }) => {
          const pos = new CesiumLib.Cartesian2(evt.position.x, evt.position.y)
          const picked = viewer.scene.pick(pos)
          if (CesiumLib.defined(picked) && picked.id) {
            const found = earthquakesRef.current.find(e => e.id === (picked.id as { id?: string }).id)
            setSelectedEq(found ?? null)
          } else {
            setSelectedEq(null)
          }
        }, CesiumLib.ScreenSpaceEventType.LEFT_CLICK)

        viewerRef.current = viewer
        if (!cancelled) setCesiumReady(true)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Cesium initialization failed'
          )
        }
      }
    }

    init()

    return () => {
      cancelled = true
      const v = viewerRef.current
      if (v && !v.isDestroyed()) {
        v.destroy()
      }
      viewerRef.current = null
      entitiesRef.current = []
      faultEntitiesRef.current = []
      impactEntitiesRef.current = []
      mainshockEntitiesRef.current = []
      aftershockEntitiesRef.current = []
    }
    // epicenter is used only for the initial flyTo — intentionally excluded
    // from deps so Cesium re-initializes only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Add static geometry (fault lines, impact cone, wave pulse) ───────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const addStaticGeometry = async () => {
      const CesiumLib = await import('cesium')
      if (viewer.isDestroyed()) return

      // Clear previous static entities
      for (const ent of [...faultEntitiesRef.current, ...impactEntitiesRef.current]) {
        viewer.entities.remove(ent)
      }
      faultEntitiesRef.current = []
      impactEntitiesRef.current = []

      // Fault polylines — Boconó-Morón-El Pilar
      for (const coords of FAULT_SEGMENTS) {
        const ent = viewer.entities.add({
          show: !!(activeLayers.faults ?? false),
          polyline: {
            positions: CesiumLib.Cartesian3.fromDegreesArray(coords),
            material: new CesiumLib.PolylineGlowMaterialProperty({
              glowPower: 0.25,
              color: CesiumLib.Color.fromCssColorString(C_AMBER),
            }),
            width: 3,
          },
        })
        faultEntitiesRef.current.push(ent)
      }

      // Impact cone — 100 km radius centered on epicenter
      const coneEnt = viewer.entities.add({
        show: !!(activeLayers.shakemap ?? true),
        position: CesiumLib.Cartesian3.fromDegrees(epicenter.lng, epicenter.lat),
        ellipse: {
          semiMajorAxis: IMPACT_RADIUS,
          semiMinorAxis: IMPACT_RADIUS,
          material: CesiumLib.Color.fromCssColorString(C_RED).withAlpha(0.2),
          outline: true,
          outlineColor: CesiumLib.Color.fromCssColorString(C_RED).withAlpha(0.7),
          outlineWidth: 2,
          height: 0,
        },
      })
      impactEntitiesRef.current.push(coneEnt)

      // Seismic wave pulse — animated ellipse expanding from epicenter
      const waveStart = Date.now()

      // Cache radius per Cesium frame: both semiMajorAxis and semiMinorAxis share
      // this same CallbackProperty instance. Using secondsOfDay as cache key ensures
      // both return the identical value within one render tick, preventing the
      // semiMajorAxis < semiMinorAxis error at period-reset boundaries.
      let _waveR = 1000
      let _waveT = -1
      const waveRadius = new CesiumLib.CallbackProperty((time?: { secondsOfDay: number }) => {
        if (time && time.secondsOfDay !== _waveT) {
          const elapsed = (Date.now() - waveStart) / 1000
          _waveR = Math.max(1000, ((elapsed % WAVE_PERIOD_S) / WAVE_PERIOD_S) * WAVE_MAX_RADIUS)
          _waveT = time.secondsOfDay
        }
        return _waveR
      }, false)

      const waveEnt = viewer.entities.add({
        show: !!(activeLayers.shakemap ?? true),
        position: CesiumLib.Cartesian3.fromDegrees(epicenter.lng, epicenter.lat),
        ellipse: {
          semiMajorAxis: waveRadius,
          semiMinorAxis: waveRadius,
          material: CesiumLib.Color.fromCssColorString(C_AMBER).withAlpha(0.08),
          outline: true,
          outlineColor: CesiumLib.Color.fromCssColorString(C_AMBER).withAlpha(0.35),
          outlineWidth: 1,
          height: 0,
        },
      })
      impactEntitiesRef.current.push(waveEnt)
    }

    addStaticGeometry()

    return () => {
      const v = viewerRef.current
      if (v && !v.isDestroyed()) {
        for (const ent of [...faultEntitiesRef.current, ...impactEntitiesRef.current]) {
          v.entities.remove(ent)
        }
      }
      faultEntitiesRef.current = []
      impactEntitiesRef.current = []
    }
    // epicenter values are constant — excluded from deps intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumReady])

  // Keep earthquakesRef in sync for click handler lookups
  useEffect(() => { earthquakesRef.current = earthquakes }, [earthquakes])

  // ── Layer visibility toggles ──────────────────────────────────────────────
  useEffect(() => {
    const show = !!(activeLayers.faults ?? false)
    for (const ent of faultEntitiesRef.current) ent.show = show
  }, [activeLayers.faults])

  useEffect(() => {
    const show = !!(activeLayers.shakemap ?? true)
    for (const ent of impactEntitiesRef.current) ent.show = show
  }, [activeLayers.shakemap])

  useEffect(() => {
    const show = !!(activeLayers.epicenters ?? true)
    for (const ent of mainshockEntitiesRef.current) ent.show = show
  }, [activeLayers.epicenters])

  useEffect(() => {
    const show = !!(activeLayers.aftershocks ?? true)
    for (const ent of aftershockEntitiesRef.current) ent.show = show
  }, [activeLayers.aftershocks])

  // ── Satellite imagery layer toggle ────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const toggle = async () => {
      const CesiumLib = await import('cesium')
      if (viewer.isDestroyed()) return

      // Remove any existing satellite layer (index > 0 to keep dark basemap)
      while (viewer.imageryLayers.length > 1) {
        viewer.imageryLayers.remove(viewer.imageryLayers.get(viewer.imageryLayers.length - 1))
      }

      if (satellite) {
        viewer.imageryLayers.addImageryProvider(
          new CesiumLib.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            credit: '© Esri, DigitalGlobe, GeoEye, USDA FSA, USGS',
            maximumLevel: 19,
          })
        )
      }
    }

    toggle()
  }, [cesiumReady, satellite])

  // ── Update earthquake markers when data changes ───────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const update = async () => {
      const CesiumLib = await import('cesium') // cached after first load
      if (viewer.isDestroyed()) return

      // Remove previous markers
      for (const ent of entitiesRef.current) viewer.entities.remove(ent)
      entitiesRef.current = []
      mainshockEntitiesRef.current = []
      aftershockEntitiesRef.current = []

      const showMain  = !!(activeLayers.epicenters  ?? true)
      const showAfter = !!(activeLayers.aftershocks ?? true)

      // Ring appearance scaled by magnitude
      // maxRadius = M² * 2500 m  →  M7.5→141km  M5→63km  M3→23km
      // periodMs  = 2500 + M*400  → bigger = slower, more imposing
      // ringCount: M≥6.5=3, M5-6.4=2, M4-4.9=1, M<4=0 (only point)
      function ringParams(mag: number) {
        return {
          ringCount:  mag >= 6.5 ? 3 : mag >= 5 ? 2 : mag >= 4 ? 1 : 0,
          maxRadius:  mag * mag * 2500,
          periodMs:   2500 + mag * 400,
          outlineW:   mag >= 6.5 ? 3 : mag >= 5 ? 2 : 1.5,
        }
      }

      const globalStart = Date.now()

      for (const eq of earthquakes) {
        const isMain = eq.magnitude >= 6.5
        const hex =
          eq.magnitude >= 6.5 ? C_RED :
          eq.magnitude >= 4   ? C_AMBER :
                                C_GREEN
        const color  = CesiumLib.Color.fromCssColorString(hex)
        const show   = isMain ? showMain : showAfter
        const pos    = CesiumLib.Cartesian3.fromDegrees(eq.lng, eq.lat)
        const { ringCount, maxRadius, periodMs, outlineW } = ringParams(eq.magnitude)

        // ── Expanding ring waves ──────────────────────────────────────────
        for (let ri = 0; ri < ringCount; ri++) {
          const phaseMs = (ri / ringCount) * periodMs
          // Per-ring cached radius — shared by both semiMajorAxis and semiMinorAxis
          let _r = 1_000, _rt = -1
          let _c = CesiumLib.Color.fromCssColorString(hex).withAlpha(0.5), _ct = -1

          const ringRadius = new CesiumLib.CallbackProperty((time?: { secondsOfDay: number }) => {
            if (time && time.secondsOfDay !== _rt) {
              const t = ((Date.now() - globalStart + phaseMs) % periodMs) / periodMs
              _r  = Math.max(1_000, t * maxRadius)
              _rt = time.secondsOfDay
            }
            return _r
          }, false)

          const ringColor = new CesiumLib.CallbackProperty((time?: { secondsOfDay: number }) => {
            if (time && time.secondsOfDay !== _ct) {
              const t = ((Date.now() - globalStart + phaseMs) % periodMs) / periodMs
              _c  = CesiumLib.Color.fromCssColorString(hex).withAlpha(Math.max(0, 0.65 * (1 - t)))
              _ct = time.secondsOfDay
            }
            return _c
          }, false)

          const ringEnt = viewer.entities.add({
            show,
            position: pos,
            ellipse: {
              semiMajorAxis: ringRadius,
              semiMinorAxis: ringRadius,
              material:      CesiumLib.Color.TRANSPARENT,
              outline:       true,
              outlineColor:  ringColor,
              outlineWidth:  outlineW,
              height:        0,
            },
          })
          entitiesRef.current.push(ringEnt)
          if (isMain) mainshockEntitiesRef.current.push(ringEnt)
          else aftershockEntitiesRef.current.push(ringEnt)
        }

        // ── Central point + label (on top of rings) ──────────────────────
        const pointSize = eq.magnitude >= 6.5 ? eq.magnitude * 5 : Math.max(5, eq.magnitude * 3)
        const entity = viewer.entities.add({
          id:   eq.id,
          show,
          position: pos,
          point: {
            pixelSize:    pointSize,
            color,
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 1,
          },
          label: {
            text:         `M${eq.magnitude.toFixed(1)}`,
            font:         `${eq.magnitude >= 5 ? 13 : 10}px monospace`,
            fillColor:    color,
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 2,
            style:        CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset:  new CesiumLib.Cartesian2(0, -22),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            // Only show labels for M≥4 at zoom; smaller ones appear on closer view
            distanceDisplayCondition: new CesiumLib.DistanceDisplayCondition(
              0,
              eq.magnitude >= 5 ? 2_000_000 : eq.magnitude >= 4 ? 800_000 : 300_000
            ),
          },
        })
        entitiesRef.current.push(entity)
        if (isMain) mainshockEntitiesRef.current.push(entity)
        else aftershockEntitiesRef.current.push(entity)
      }
    }

    update()
  }, [earthquakes, cesiumReady, activeLayers.epicenters, activeLayers.aftershocks])

  // ── Resize when globe becomes visible ────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current
    if (visible && viewer && !viewer.isDestroyed()) {
      viewer.resize()
    }
  }, [visible])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: visible ? 'block' : 'none',
        backgroundColor: C_BG,
      }}
    >
      {/* Error fallback */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.625rem',
              color: 'var(--color-red)',
              letterSpacing: '0.1em',
              border: '1px solid var(--color-red)',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-panel)',
            }}
          >
            [CESIUM ERROR] {error}
          </div>
        </div>
      )}

      {/* Globe canvas target */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* HUD popup — selected earthquake info */}
      {selectedEq && (
        <div
          onClick={() => setSelectedEq(null)}
          style={{
            position: 'absolute',
            bottom: 48,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,10,15,0.92)',
            border: `1px solid ${selectedEq.magnitude >= 6.5 ? C_RED : selectedEq.magnitude >= 4 ? C_AMBER : C_GREEN}`,
            padding: '0.625rem 1rem',
            fontFamily: 'var(--font-hud)',
            zIndex: 30,
            pointerEvents: 'auto',
            cursor: 'pointer',
            minWidth: 220,
          }}
        >
          <div style={{ fontSize: '0.625rem', color: selectedEq.magnitude >= 6.5 ? C_RED : selectedEq.magnitude >= 4 ? C_AMBER : C_GREEN, letterSpacing: '0.15em', marginBottom: 4 }}>
            M{selectedEq.magnitude.toFixed(1)} · SISMO DETECTADO
          </div>
          {selectedEq.place && (
            <div style={{ fontSize: '0.5rem', color: '#E0E8F0', marginBottom: 2 }}>{selectedEq.place}</div>
          )}
          <div style={{ fontSize: '0.4375rem', color: '#607080' }}>
            Prof: {selectedEq.depth} km
            {selectedEq.time && ` · ${new Date(selectedEq.time).toISOString().slice(0, 16).replace('T', ' ')} UTC`}
          </div>
          <div style={{ fontSize: '0.375rem', color: '#607080', marginTop: 4, letterSpacing: '0.1em' }}>CLICK PARA CERRAR</div>
        </div>
      )}

      {/* Loading state */}
      {!cesiumReady && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.625rem',
              color: 'var(--color-cyan)',
              letterSpacing: '0.3em',
            }}
          >
            INICIALIZANDO GLOBO 3D...
          </span>
        </div>
      )}
    </div>
  )
}
