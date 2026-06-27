'use client'

import { useState } from 'react'

interface ViewModeToggleProps {
  mode: '2d' | '3d'
  onChange: (mode: '2d' | '3d') => void
  className?: string
}

export default function ViewModeToggle({ mode, onChange, className = '' }: ViewModeToggleProps) {
  const [glitching, setGlitching] = useState(false)

  const handle = (next: '2d' | '3d') => {
    if (next === mode) return
    setGlitching(true)
    setTimeout(() => {
      onChange(next)
      setGlitching(false)
    }, 200)
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: 2,
        opacity: glitching ? 0.6 : 1,
        transition: 'opacity 0.2s',
        filter: glitching ? 'hue-rotate(90deg)' : 'none',
      }}
      title="Toggle 2D / 3D view"
    >
      {(['2d', '3d'] as const).map((m) => (
        <button
          key={m}
          onClick={() => handle(m)}
          style={{
            fontFamily: 'var(--font-hud)',
            fontSize: '0.625rem',
            letterSpacing: '0.15em',
            padding: '0.25rem 0.625rem',
            background: 'var(--color-panel)',
            border: `1px solid ${mode === m ? 'var(--color-green)' : 'var(--color-slate)'}`,
            color: mode === m ? 'var(--color-green)' : 'var(--color-muted)',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'color 0.15s, border-color 0.15s',
            lineHeight: 1,
          }}
        >
          {m === '3d' ? '3D GLOBO' : '2D'}
        </button>
      ))}
    </div>
  )
}
