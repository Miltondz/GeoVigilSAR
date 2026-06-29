'use client'

import { useState } from 'react'
import { EVENT_REGISTRY, type EventConfig } from '@/lib/events/index'
import GlitchTransition from '@/components/ui/GlitchTransition'

interface ViewportBbox {
  minLat: number; maxLat: number; minLng: number; maxLng: number
}

interface EventSelectorProps {
  activeEventId: string
  onSelect: (eventId: string) => void
  viewportBbox?: ViewportBbox | null
}

function isViewportNearEvent(vp: ViewportBbox | null | undefined, evt: EventConfig): boolean {
  if (!vp) return false
  const cLat = (vp.minLat + vp.maxLat) / 2
  const cLng = (vp.minLng + vp.maxLng) / 2
  const { minLat, maxLat, minLng, maxLng } = evt.bbox
  const pad = 8 // degrees padding
  return cLat >= minLat - pad && cLat <= maxLat + pad && cLng >= minLng - pad && cLng <= maxLng + pad
}

export default function EventSelector({ activeEventId, onSelect, viewportBbox }: EventSelectorProps) {
  const [open, setOpen] = useState(false)
  const active = EVENT_REGISTRY[activeEventId]
  const geoActive = isViewportNearEvent(viewportBbox, active)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          background: 'none',
          border: `1px solid ${open ? 'var(--color-cyan)' : 'var(--color-slate)'}`,
          padding: '0.2rem 0.5rem',
          cursor: 'pointer',
        }}
      >
        <span style={{
          display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
          backgroundColor: geoActive ? 'var(--color-green)' : 'var(--color-muted)',
          boxShadow: geoActive ? '0 0 6px var(--color-green)' : 'none',
        }} />
        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-cyan)', letterSpacing: '0.1em' }}>
          {activeEventId}
        </span>
        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>▾</span>
      </button>

      {open && (
        <GlitchTransition trigger={open}>
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            minWidth: 260,
            backgroundColor: 'var(--color-panel)',
            border: '1px solid var(--color-slate)',
            zIndex: 200,
          }}>
            {Object.values(EVENT_REGISTRY).map(evt => {
              const nearby = isViewportNearEvent(viewportBbox, evt)
              return (
                <button
                  key={evt.id}
                  onClick={() => { onSelect(evt.id); setOpen(false) }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: evt.id === activeEventId ? 'rgba(0,180,255,0.08)' : 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--color-slate)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {/* Event ID + geo status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{
                      display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                      backgroundColor: nearby ? 'var(--color-green)' : 'var(--color-muted)',
                      boxShadow: nearby ? '0 0 5px var(--color-green)' : 'none',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: evt.id === activeEventId ? 'var(--color-cyan)' : 'var(--color-text)', letterSpacing: '0.1em' }}>
                      {evt.id}
                    </span>
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: nearby ? 'var(--color-green)' : 'var(--color-muted)', marginLeft: 'auto', letterSpacing: '0.1em' }}>
                      {nearby ? 'EN ZONA' : 'FUERA'}
                    </span>
                  </div>

                  {/* Event name */}
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.5625rem', color: 'var(--color-muted)', paddingLeft: '0.875rem' }}>
                    {evt.name.es} · {evt.faultSystem}
                  </span>

                  {/* Main shocks list */}
                  {evt.mainShocks && evt.mainShocks.length > 0 && (
                    <div style={{ paddingLeft: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      {evt.mainShocks.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                          <span style={{
                            fontFamily: 'var(--font-hud)', fontSize: '0.5625rem',
                            color: s.magnitude >= 7 ? 'var(--color-red)' : 'var(--color-amber)',
                            fontWeight: 700,
                          }}>
                            M{s.magnitude}
                          </span>
                          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)' }}>
                            {s.timeStr}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </GlitchTransition>
      )}
    </div>
  )
}
