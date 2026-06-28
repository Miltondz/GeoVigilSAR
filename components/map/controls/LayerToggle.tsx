'use client'

import { useState, useRef, useEffect } from 'react'
import GlitchTransition from '@/components/ui/GlitchTransition'

interface LayerToggleProps {
  layers: Record<string, boolean>
  onChange: (id: string, visible: boolean) => void
  className?: string
}

interface LayerDef {
  id: string
  icon: string
  label: string
  tip: string
}

interface GroupDef {
  id: string
  icon: string
  color: string
  label: string
  layers: LayerDef[]
}

const GROUPS: GroupDef[] = [
  {
    id: 'seismic', icon: '◉', color: 'var(--color-amber)', label: 'SÍSMICAS',
    layers: [
      { id: 'epicenters',     icon: '◉', label: 'Epicentros',       tip: 'Sismos principales Mw 7.2 + Mw 7.5' },
      { id: 'aftershocks',    icon: '≋', label: 'Réplicas RT',       tip: 'Réplicas en tiempo real — USGS feed' },
      { id: 'emscSeismic',    icon: '≈', label: 'Réplicas EMSC',     tip: 'Sensores europeos EMSC complementarios' },
      { id: 'shakemap',       icon: '◎', label: 'ShakeMap PGA',      tip: 'Intensidad sísmica — aceleración del suelo' },
      { id: 'faults',         icon: '╱', label: 'Fallas geológicas', tip: 'Sistema Boconó-Morón-El Pilar activo' },
      { id: 'seismicHistory', icon: '⊞', label: 'Historial 30d',     tip: 'Historial sísmico de los últimos 30 días' },
    ],
  },
  {
    id: 'satellite', icon: '⊛', color: 'var(--color-cyan)', label: 'SATELITAL',
    layers: [
      { id: 'satellite',   icon: '⊛', label: 'Basemap ESRI',   tip: 'Imagen satelital de fondo — ESRI World Imagery' },
      { id: 'sarChange',   icon: '◈', label: 'SAR cambio',      tip: 'Detección de cambios — Sentinel-1 C-band' },
      { id: 'opticalPre',  icon: '◧', label: 'Óptico pre',      tip: 'Sentinel-2 óptico — antes del evento' },
      { id: 'opticalPost', icon: '◨', label: 'Óptico post',     tip: 'Sentinel-2 óptico — después del evento' },
      { id: 'sarLband',    icon: '◫', label: 'SAR L-band',      tip: 'ALOS-2 L-band — mayor penetración de vegetación' },
      { id: 'ariaDPM',     icon: '▣', label: 'ARIA Damage Map', tip: 'Mapa de daño proxy — Advanced Rapid Imaging' },
      { id: 'firms',       icon: '◆', label: 'Calor FIRMS',     tip: 'Focos de calor activos — NASA FIRMS VIIRS' },
    ],
  },
  {
    id: 'humanitarian', icon: '⊕', color: 'var(--color-red)', label: 'HUMANITARIO',
    layers: [
      { id: 'damagePoints', icon: '⚑', label: 'Daños confirmados', tip: 'Puntos de daño — clasificación SAR + campo' },
      { id: 'hospitals',    icon: '⊕', label: 'Hospitales',        tip: 'Centros médicos activos — estado operativo' },
      { id: 'shelters',     icon: '⌂', label: 'Refugios',          tip: 'Albergues y refugios temporales activos' },
      { id: 'evacRoutes',   icon: '→', label: 'Rutas evacuación',  tip: 'Corredores humanitarios verificados' },
      { id: 'noAccess',     icon: '⊘', label: 'Sin acceso',        tip: 'Zonas de acceso restringido o inaccesible' },
    ],
  },
  {
    id: 'context', icon: '▣', color: 'var(--color-text)', label: 'CONTEXTO',
    layers: [
      { id: 'adminBoundaries', icon: '▣', label: 'Límites admin.',  tip: 'Estados y municipios — Venezuela' },
      { id: 'buildings',       icon: '▪', label: 'Edificios OSM',   tip: 'Huella de edificios — OpenStreetMap' },
      { id: 'population',      icon: '⊡', label: 'Densidad poblac.',tip: 'Población estimada por cuadrante (WorldPop)' },
      { id: 'geoNews',         icon: '◈', label: 'Noticias geo',    tip: 'Artículos geolocalizados — GDELT API' },
    ],
  },
  {
    id: 'analytical', icon: '◈', color: 'var(--color-green)', label: 'ANALÍTICO',
    layers: [
      { id: 'vulnerability', icon: '◈', label: 'Vulnerabilidad',  tip: 'Índice de vulnerabilidad compuesta (población + edificios + exposición sísmica)' },
      { id: 'insar',         icon: '⋱', label: 'InSAR deform.',   tip: 'Interferograma SAR — deformación del suelo en cm' },
    ],
  },
  {
    id: 'air', icon: '⊿', color: 'var(--color-cyan)', label: 'AÉREO',
    layers: [
      { id: 'airTraffic', icon: '⊿', label: 'Tráfico aéreo RT', tip: 'Aeronaves en tiempo real — OpenSky Network (60s)' },
    ],
  },
  {
    id: 'orbital', icon: '○', color: 'var(--color-muted)', label: 'ORBITAL',
    layers: [
      { id: 'satellites', icon: '○', label: 'Órbitas Sentinel-1', tip: 'Trayectorias satelitales en tiempo real — SGP4' },
    ],
  },
  {
    id: 'copernicus', icon: '⊚', color: 'var(--color-cyan)', label: 'COPERNICUS',
    layers: [
      { id: 'emsr884',         icon: '◧', label: 'EMSR884 zonas', tip: 'Copernicus EMS EMSR884 — zonas de intervención' },
      { id: 'emsr884Products', icon: '◨', label: 'EMSR884 daños', tip: 'Copernicus EMS EMSR884 — productos de daños VT' },
    ],
  },
]

export default function LayerToggle({ layers, onChange, className = '' }: LayerToggleProps) {
  const [open, setOpen]           = useState(false)
  const [expanded, setExpanded]   = useState<Set<string>>(new Set(['seismic', 'satellite']))
  const panelRef                  = useRef<HTMLDivElement>(null)

  const totalActive = Object.values(layers).filter(Boolean).length

  const toggleGroup = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={panelRef} className={className} style={{ position: 'relative' }}>

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Control de capas del mapa"
        style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.6875rem',
          color: open ? 'var(--color-green)' : 'var(--color-text)',
          letterSpacing: '0.12em',
          background: 'none',
          border: `1px solid ${open ? 'var(--color-green)' : 'var(--color-slate)'}`,
          padding: '0.25rem 0.625rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          transition: 'color 0.15s, border-color 0.15s',
        }}
      >
        <span style={{ fontSize: '0.75rem' }}>▤</span>
        CAPAS
        {totalActive > 0 && (
          <span style={{
            fontSize: '0.5625rem',
            background: 'var(--color-green)',
            color: '#000',
            borderRadius: 2,
            padding: '0 4px',
            fontWeight: 700,
            lineHeight: '14px',
          }}>
            {totalActive}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <GlitchTransition trigger={open}>
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 320,
            maxHeight: 'calc(100vh - 70px)',
            overflowY: 'auto',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-slate)',
            zIndex: 200,
          }}>
            {/* Panel header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid var(--color-slate)',
              backgroundColor: 'var(--color-panel)',
            }}>
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', letterSpacing: '0.15em' }}>
                CONTROL DE CAPAS
              </span>
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-green)' }}>
                {totalActive} activas
              </span>
            </div>

            {/* Groups */}
            {GROUPS.map(group => {
              const activeCount = group.layers.filter(l => !!layers[l.id]).length
              const isExpanded  = expanded.has(group.id)

              return (
                <div key={group.id} style={{ borderBottom: '1px solid var(--color-slate)' }}>

                  {/* Group header — clickable accordion */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4375rem 0.75rem',
                      background: isExpanded ? 'rgba(255,255,255,0.03)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', color: group.color, lineHeight: 1, width: 16, textAlign: 'center', flexShrink: 0 }}>
                      {group.icon}
                    </span>
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: activeCount > 0 ? group.color : 'var(--color-muted)', letterSpacing: '0.12em', flex: 1 }}>
                      {group.label}
                    </span>
                    {activeCount > 0 && (
                      <span style={{
                        fontFamily: 'var(--font-hud)',
                        fontSize: '0.5rem',
                        color: group.color,
                        border: `1px solid ${group.color}`,
                        padding: '0 4px',
                        lineHeight: '14px',
                        flexShrink: 0,
                      }}>
                        {activeCount}/{group.layers.length}
                      </span>
                    )}
                    <span style={{ fontSize: '0.5rem', color: 'var(--color-muted)', flexShrink: 0 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </button>

                  {/* Layer list */}
                  {isExpanded && (
                    <div style={{ padding: '0.125rem 0 0.375rem 0', backgroundColor: 'rgba(0,0,0,0.25)' }}>
                      {group.layers.map(layer => {
                        const active = !!layers[layer.id]
                        return (
                          <label
                            key={layer.id}
                            title={layer.tip}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.3125rem 0.75rem 0.3125rem 2.25rem',
                              cursor: 'pointer',
                              backgroundColor: active ? 'rgba(0,255,136,0.04)' : 'transparent',
                              borderLeft: active ? `2px solid ${group.color}` : '2px solid transparent',
                              transition: 'all 0.1s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={e => onChange(layer.id, e.target.checked)}
                              style={{ accentColor: group.color, width: 13, height: 13, flexShrink: 0 }}
                            />
                            <span style={{
                              fontSize: '0.8125rem',
                              color: group.color,
                              lineHeight: 1,
                              width: 16,
                              textAlign: 'center',
                              flexShrink: 0,
                              opacity: active ? 1 : 0.45,
                            }}>
                              {layer.icon}
                            </span>
                            <span style={{
                              fontFamily: 'var(--font-hud)',
                              fontSize: '0.6875rem',
                              color: active ? 'var(--color-text)' : 'var(--color-muted)',
                              lineHeight: 1.3,
                              flex: 1,
                            }}>
                              {layer.label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </GlitchTransition>
      )}
    </div>
  )
}
