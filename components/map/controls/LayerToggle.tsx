'use client'

import { useState } from 'react'
import GlitchTransition from '@/components/ui/GlitchTransition'

interface LayerToggleProps {
  layers: Record<string, boolean>
  onChange: (id: string, visible: boolean) => void
  className?: string
}

const LAYER_GROUPS = [
  {
    label: 'CAPAS SÍSMICAS',
    layers: [
      { id: 'epicenters',      label: 'Epicentros' },
      { id: 'aftershocks',     label: 'Réplicas en tiempo real' },
      { id: 'shakemap',        label: 'ShakeMap — Intensidad PGA' },
      { id: 'faults',          label: 'Fallas geológicas' },
      { id: 'seismicHistory',  label: 'Historial sísmico' },
    ],
  },
  {
    label: 'CAPAS SATELITALES',
    layers: [
      { id: 'sarChange',   label: 'SAR Change Detection — S1' },
      { id: 'opticalPre',  label: 'Óptico antes — Sentinel-2' },
      { id: 'opticalPost', label: 'Óptico después — Sentinel-2' },
      { id: 'sarLband',    label: 'SAR L-band — ALOS-2' },
      { id: 'ariaDPM',     label: 'ARIA Damage Proxy Map' },
      { id: 'firms',       label: 'Focos de calor — FIRMS' },
    ],
  },
  {
    label: 'CAPAS HUMANITARIAS',
    layers: [
      { id: 'damagePoints', label: 'Puntos de daño confirmado' },
      { id: 'hospitals',    label: 'Hospitales y centros médicos' },
      { id: 'shelters',     label: 'Refugios activos' },
      { id: 'evacRoutes',   label: 'Rutas de evacuación' },
      { id: 'noAccess',     label: 'Zonas sin acceso' },
    ],
  },
  {
    label: 'CONTEXTO',
    layers: [
      { id: 'buildings',   label: 'Edificios OpenStreetMap' },
      { id: 'population',  label: 'Densidad poblacional' },
      { id: 'geoNews',     label: 'Noticias geolocalizadas' },
    ],
  },
  {
    label: 'ANALÍTICO / SAR',
    layers: [
      { id: 'vulnerability', label: 'Vulnerabilidad compuesta' },
    ],
  },
]

export default function LayerToggle({ layers, onChange, className = '' }: LayerToggleProps) {
  const [open, setOpen] = useState(false)
  const [lastChanged, setLastChanged] = useState('')

  const handleChange = (id: string, val: boolean) => {
    onChange(id, val)
    setLastChanged(id)
  }

  return (
    <div className={className} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.625rem',
          color: open ? 'var(--color-green)' : 'var(--color-text)',
          letterSpacing: '0.15em',
          background: 'none',
          border: `1px solid ${open ? 'var(--color-green)' : 'var(--color-slate)'}`,
          padding: '0.25rem 0.625rem',
          cursor: 'pointer',
          textTransform: 'uppercase',
          transition: 'all 0.2s',
        }}
      >
        CAPAS
      </button>

      {open && (
        <GlitchTransition trigger={open}>
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            width: 240,
            backgroundColor: 'var(--color-panel)',
            border: '1px solid var(--color-slate)',
            padding: '0.75rem',
            zIndex: 100,
          }}>
            {LAYER_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: '0.75rem' }}>
                <div style={{
                  fontFamily: 'var(--font-hud)',
                  fontSize: '0.5rem',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.15em',
                  marginBottom: '0.375rem',
                }}>
                  {group.label}
                </div>
                {group.layers.map(layer => (
                  <label key={layer.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.2rem 0',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={!!layers[layer.id]}
                      onChange={e => handleChange(layer.id, e.target.checked)}
                      style={{ accentColor: 'var(--color-green)', width: 10, height: 10 }}
                    />
                    <span style={{
                      fontFamily: 'var(--font-hud)',
                      fontSize: '0.625rem',
                      color: layers[layer.id] ? 'var(--color-text)' : 'var(--color-muted)',
                    }}>
                      {layer.label}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </GlitchTransition>
      )}
    </div>
  )
}
