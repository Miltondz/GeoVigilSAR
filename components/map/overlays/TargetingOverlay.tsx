'use client'

import { useEffect, useState } from 'react'

interface TargetingOverlayProps {
  point?: { x: number; y: number } | null
  nodeId?: string
  coords?: { lat: number; lng: number }
  onClose?: () => void
}

function Bracket({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const S = 14
  const T = 2
  const C = 'var(--color-green)'
  const h = corner.startsWith('t') ? { top: 0 } : { bottom: 0 }
  const v = corner.endsWith('l') ? { left: 0 } : { right: 0 }

  return (
    <div style={{ position: 'absolute', ...h, ...v, width: S, height: S }}>
      <div style={{ position: 'absolute', ...h, ...v, width: S, height: T, backgroundColor: C, boxShadow: `0 0 4px ${C}` }} />
      <div style={{ position: 'absolute', ...h, ...v, width: T, height: S, backgroundColor: C, boxShadow: `0 0 4px ${C}` }} />
    </div>
  )
}

export default function TargetingOverlay({ point, nodeId, coords, onClose }: TargetingOverlayProps) {
  const [visible, setVisible] = useState(false)
  const [acquired, setAcquired] = useState(false)

  useEffect(() => {
    if (point) {
      setVisible(true)
      setAcquired(true)
      const t = setTimeout(() => setAcquired(false), 150)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
      setAcquired(false)
    }
  }, [point])

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => { setVisible(false); onClose?.() }, 8000)
    return () => clearTimeout(t)
  }, [visible, onClose])

  if (!point || !visible) return null

  return (
    <div
      onClick={() => { setVisible(false); onClose?.() }}
      style={{
        position: 'absolute',
        left: point.x - 30,
        top: point.y - 30,
        width: 60,
        height: 60,
        cursor: 'pointer',
        zIndex: 50,
        animation: 'bracket-converge 300ms ease-out forwards',
        overflow: 'visible',
      }}
    >
      {/* Acquisition flash */}
      {acquired && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255,255,255,0.8)',
            animation: 'targeting-acquire 150ms ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Scan line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: 2,
          backgroundColor: 'var(--color-green)',
          opacity: 0.15,
          animation: 'targeting-scan 2s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <Bracket corner="tl" />
      <Bracket corner="tr" />
      <Bracket corner="bl" />
      <Bracket corner="br" />

      {/* Info box */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 6,
          fontFamily: 'var(--font-hud)',
          fontSize: '0.5rem',
          color: 'var(--color-green)',
          whiteSpace: 'nowrap',
          letterSpacing: '0.1em',
          textShadow: '0 0 6px var(--color-green)',
          lineHeight: 1.6,
          textAlign: 'left',
        }}
      >
        {nodeId && <div>NODE-ID: {nodeId}</div>}
        {coords && (
          <div>
            LAT: {coords.lat.toFixed(4)} LNG: {coords.lng.toFixed(4)}
          </div>
        )}
        <div>STATUS: LOCKED</div>
      </div>
    </div>
  )
}
