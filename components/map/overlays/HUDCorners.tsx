'use client'

import { useEffect, useState } from 'react'
import { VEN_2406 } from '@/lib/events/ven-2406'

interface HUDCornersProps {
  centerLat?: number
  centerLng?: number
  zoom?: number
  flightCount?: number
  timelinePhase?: 'pre' | 'main' | 'post'
  timelineMs?: number
}

const L = 20
const T = 2
const C = 'var(--color-slate)'
const FONT = 'var(--font-hud)'

function Corner({ top, left, right, bottom }: { top?: boolean; left?: boolean; right?: boolean; bottom?: boolean }) {
  return (
    <div style={{ position: 'absolute', top: top ? 8 : undefined, bottom: bottom ? 8 : undefined, left: left ? 8 : undefined, right: right ? 8 : undefined }}>
      {/* horizontal */}
      <div style={{ position: 'absolute', top: top ? 0 : undefined, bottom: bottom ? 0 : undefined, left: left ? 0 : undefined, right: right ? 0 : undefined, width: L, height: T, backgroundColor: C }} />
      {/* vertical */}
      <div style={{ position: 'absolute', top: top ? 0 : undefined, bottom: bottom ? 0 : undefined, left: left ? 0 : undefined, right: right ? 0 : undefined, width: T, height: L, backgroundColor: C }} />
    </div>
  )
}

function formatTOffset(diffMs: number): string {
  const abs  = Math.abs(diffMs)
  const hh   = Math.floor(abs / 3600000).toString().padStart(2, '0')
  const mins = Math.floor((abs % 3600000) / 60000).toString().padStart(2, '0')
  return `${hh}:${mins}`
}

export default function HUDCorners({
  centerLat = 10.4,
  centerLng = -68.7,
  zoom = 7,
  flightCount,
  timelinePhase,
  timelineMs,
}: HUDCornersProps) {
  const [utc, setUtc] = useState('')

  useEffect(() => {
    const tick = () => setUtc(new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const baseStyle: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: '0.5rem',
    color: 'var(--color-muted)',
    letterSpacing: '0.05em',
    lineHeight: 1.6,
    pointerEvents: 'none',
  }

  // T-offset label derived from timelineMs vs mainShockTime
  let tLabel: string | null = null
  let tColor = 'var(--color-muted)'

  if (timelinePhase !== undefined && timelineMs !== undefined) {
    const diffMs = timelineMs - VEN_2406.mainShockTime

    if (timelinePhase === 'main') {
      tLabel = 'T+00:00 EVENTO PRINCIPAL'
      tColor = 'var(--color-red)'
    } else if (diffMs < 0) {
      tLabel = `T-${formatTOffset(diffMs)} ANTES DEL EVENTO`
      tColor = 'var(--color-green)'
    } else {
      tLabel = `T+${formatTOffset(diffMs)} POST-EVENTO`
      tColor = 'var(--color-amber)'
    }
  } else if (timelinePhase === 'main') {
    tLabel = 'T+00:00 EVENTO PRINCIPAL'
    tColor = 'var(--color-red)'
  } else if (timelinePhase === 'pre') {
    tLabel = 'PRE-EVENTO'
    tColor = 'var(--color-green)'
  } else if (timelinePhase === 'post') {
    tLabel = 'POST-EVENTO'
    tColor = 'var(--color-amber)'
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      {/* TL */}
      <Corner top left />
      <div style={{ ...baseStyle, position: 'absolute', top: 14, left: 16 }}>
        <div>{centerLat.toFixed(4)}°N</div>
        <div>{Math.abs(centerLng).toFixed(4)}°W</div>
      </div>

      {/* TR */}
      <Corner top right />
      <div style={{ ...baseStyle, position: 'absolute', top: 14, right: 16, textAlign: 'right' }}>
        <div>{utc}</div>
        <div>ZOOM {zoom.toFixed(1)}</div>
        <div style={{ color: 'var(--color-cyan)', fontSize: '0.5rem' }}>
          FLIGHTS TRACKED: {flightCount != null && flightCount > 0 ? flightCount : '--'}
        </div>
      </div>

      {/* BL */}
      <Corner bottom left />
      <div style={{ ...baseStyle, position: 'absolute', bottom: 14, left: 16 }}>
        <div>WGS84</div>
        <div>VEN-2406</div>
        {tLabel && (
          <div style={{ fontFamily: FONT, fontSize: '0.5rem', color: tColor, marginTop: 2 }}>
            {tLabel}
          </div>
        )}
      </div>

      {/* BR */}
      <Corner bottom right />
      <div style={{ ...baseStyle, position: 'absolute', bottom: 14, right: 16, textAlign: 'right' }}>
        <div>GEOVIGIL SAR</div>
        <div>v0.1.0</div>
      </div>
    </div>
  )
}
