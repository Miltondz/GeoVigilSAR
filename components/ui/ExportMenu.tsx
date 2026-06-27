'use client'

import { useState } from 'react'
import { exportEarthquakesCSV, exportStatsJSON } from '@/lib/export'

interface ExportMenuProps {
  eventId: string
  earthquakes?: {
    id: string
    magnitude: number
    depth: number
    lat: number
    lng: number
    time: number
    place: string
    classification: string
  }[]
  stats?: Record<string, unknown>
  mapCanvasRef?: React.RefObject<HTMLCanvasElement>
}

export default function ExportMenu({ eventId, earthquakes = [], stats, mapCanvasRef }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  const handle = async (type: string) => {
    setExporting(type)
    try {
      if (type === 'csv') {
        exportEarthquakesCSV(earthquakes, eventId)
      } else if (type === 'json' && stats) {
        exportStatsJSON(stats, eventId)
      } else if (type === 'png' && mapCanvasRef?.current) {
        const { exportMapPNG } = await import('@/lib/export')
        exportMapPNG(mapCanvasRef.current, eventId)
      }
    } finally {
      setExporting(null)
      setOpen(false)
    }
  }

  const items = [
    { id: 'png', label: 'Mapa PNG', available: !!mapCanvasRef },
    { id: 'csv', label: `Réplicas CSV (${earthquakes.length})`, available: earthquakes.length > 0 },
    { id: 'json', label: 'Stats JSON', available: !!stats },
  ]

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.625rem',
          color: open ? 'var(--color-cyan)' : 'var(--color-muted)',
          letterSpacing: '0.15em',
          background: 'none',
          border: `1px solid ${open ? 'var(--color-cyan)' : 'var(--color-slate)'}`,
          padding: '0.25rem 0.625rem',
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        EXPORTAR
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 4,
          minWidth: 180,
          backgroundColor: 'var(--color-panel)',
          border: '1px solid var(--color-slate)',
          zIndex: 200,
        }}>
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => item.available && handle(item.id)}
              disabled={!item.available || exporting === item.id}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.5rem 0.75rem',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--color-slate)',
                cursor: item.available ? 'pointer' : 'default',
                fontFamily: 'var(--font-hud)',
                fontSize: '0.625rem',
                color: item.available ? 'var(--color-text)' : 'var(--color-muted)',
                opacity: item.available ? 1 : 0.4,
              }}
            >
              {exporting === item.id ? '...' : `↓ ${item.label}`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
