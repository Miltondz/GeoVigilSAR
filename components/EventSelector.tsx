'use client'

import { useState } from 'react'
import { EVENT_REGISTRY, type EventConfig } from '@/lib/events/index'
import GlitchTransition from '@/components/ui/GlitchTransition'

interface EventSelectorProps {
  activeEventId: string
  onSelect: (eventId: string) => void
}

const STATUS_COLOR: Record<string, string> = {
  active:  'var(--color-red)',
  archive: 'var(--color-muted)',
}

export default function EventSelector({ activeEventId, onSelect }: EventSelectorProps) {
  const [open, setOpen] = useState(false)
  const active = EVENT_REGISTRY[activeEventId]

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
          backgroundColor: STATUS_COLOR[active?.status ?? 'archive'],
          boxShadow: active?.status === 'active' ? `0 0 6px ${STATUS_COLOR.active}` : 'none',
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
            minWidth: 220,
            backgroundColor: 'var(--color-panel)',
            border: '1px solid var(--color-slate)',
            zIndex: 200,
          }}>
            {Object.values(EVENT_REGISTRY).map(evt => (
              <button
                key={evt.id}
                onClick={() => { onSelect(evt.id); setOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexDirection: 'column',
                  gap: '0.125rem',
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  background: evt.id === activeEventId ? 'rgba(0,180,255,0.08)' : 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--color-slate)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{
                    display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                    backgroundColor: STATUS_COLOR[evt.status],
                  }} />
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: evt.id === activeEventId ? 'var(--color-cyan)' : 'var(--color-text)', letterSpacing: '0.1em' }}>
                    {evt.id}
                  </span>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', marginLeft: 'auto' }}>
                    {evt.status.toUpperCase()}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.625rem', color: 'var(--color-muted)', paddingLeft: '0.875rem' }}>
                  {evt.name.es} · {evt.faultSystem}
                </span>
              </button>
            ))}
          </div>
        </GlitchTransition>
      )}
    </div>
  )
}
