'use client'

import { useEffect, useState } from 'react'

interface TargetingOverlayProps {
  point?: { x: number; y: number } | null
  nodeId?: string
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

export default function TargetingOverlay({ point, nodeId, onClose }: TargetingOverlayProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (point) {
      setVisible(true)
    } else {
      setVisible(false)
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
      }}
    >
      <Bracket corner="tl" />
      <Bracket corner="tr" />
      <Bracket corner="bl" />
      <Bracket corner="br" />
      {nodeId && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 4,
          fontFamily: 'var(--font-hud)',
          fontSize: '0.5rem',
          color: 'var(--color-green)',
          whiteSpace: 'nowrap',
          letterSpacing: '0.1em',
          textShadow: '0 0 6px var(--color-green)',
        }}>
          {nodeId}
        </div>
      )}
    </div>
  )
}
