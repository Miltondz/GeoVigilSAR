'use client'

import { useEffect, useRef, useState } from 'react'
import type { Viewer as CesiumViewer, Entity as CesiumEntity } from 'cesium'

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
}

interface Cesium3DGlobeProps {
  epicenter: { lat: number; lng: number }
  earthquakes: EarthquakeMarker[]
  visible: boolean
}

export default function Cesium3DGlobe({
  epicenter,
  earthquakes,
  visible,
}: Cesium3DGlobeProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const viewerRef      = useRef<CesiumViewer | null>(null)
  const entitiesRef    = useRef<CesiumEntity[]>([])
  const [cesiumReady, setCesiumReady] = useState(false)
  const [error, setError]             = useState<string | null>(null)

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
          // Free OSM imagery — no Ion key needed
          baseLayer: new CesiumLib.ImageryLayer(
            new CesiumLib.OpenStreetMapImageryProvider({
              url: 'https://tile.openstreetmap.org',
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

        // Instant fly-to epicenter at 500 km altitude
        viewer.camera.flyTo({
          destination: CesiumLib.Cartesian3.fromDegrees(
            epicenter.lng,
            epicenter.lat,
            500_000
          ),
          duration: 0,
        })

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
    }
    // epicenter is used only for the initial flyTo — intentionally excluded
    // from deps so Cesium re-initializes only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update earthquake markers when data changes ───────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return
    const viewer = viewerRef.current
    if (viewer.isDestroyed()) return

    const update = async () => {
      const CesiumLib = await import('cesium') // cached after first load
      if (viewer.isDestroyed()) return

      // Remove previous markers
      for (const ent of entitiesRef.current) {
        viewer.entities.remove(ent)
      }
      entitiesRef.current = []

      for (const eq of earthquakes) {
        const hex =
          eq.magnitude >= 6.5 ? C_RED :
          eq.magnitude >= 4   ? C_AMBER :
                                C_GREEN

        const color = CesiumLib.Color.fromCssColorString(hex)

        const entity = viewer.entities.add({
          position: CesiumLib.Cartesian3.fromDegrees(eq.lng, eq.lat),
          point: {
            pixelSize:    Math.max(8, eq.magnitude * 4),
            color,
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 1,
          },
          label: {
            text:         `M${eq.magnitude.toFixed(1)}`,
            font:         '11px monospace',
            fillColor:    color,
            outlineColor: CesiumLib.Color.BLACK,
            outlineWidth: 2,
            style:        CesiumLib.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset:  new CesiumLib.Cartesian2(0, -20),
            // Always render labels on top regardless of terrain occlusion
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })

        entitiesRef.current.push(entity)
      }
    }

    update()
  }, [earthquakes, cesiumReady])

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
