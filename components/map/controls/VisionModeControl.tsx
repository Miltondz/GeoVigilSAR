'use client'

import type { VisionMode } from '../overlays/VisionModeOverlay'

interface VisionModeControlProps {
  mode: VisionMode
  onChange: (mode: VisionMode) => void
}

const MODES: VisionMode[] = ['NORMAL', 'FLIR', 'NVG', 'CRT']
const LABELS: Record<VisionMode, string> = {
  NORMAL: 'NORM',
  FLIR: 'FLIR',
  NVG: 'NVG',
  CRT: 'CRT',
}

export default function VisionModeControl({ mode, onChange }: VisionModeControlProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--color-panel)',
        border: '1px solid var(--color-slate)',
      }}
      title="Vision mode"
    >
      {MODES.map((m, i) => (
        <div key={m} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-hud)',
                fontSize: '0.5rem',
                color: 'var(--color-slate)',
                padding: '0 1px',
                lineHeight: 1,
              }}
            >
              |
            </span>
          )}
          <button
            onClick={() => onChange(m)}
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.5rem',
              letterSpacing: '0.1em',
              padding: '0.25rem 0.375rem',
              background: 'transparent',
              border: 'none',
              borderBottom:
                mode === m
                  ? '1px solid var(--color-green)'
                  : '1px solid transparent',
              color: mode === m ? 'var(--color-green)' : 'var(--color-muted)',
              cursor: 'pointer',
              lineHeight: 1,
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {LABELS[m]}
          </button>
        </div>
      ))}
    </div>
  )
}
