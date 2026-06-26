'use client'

import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/ui/StatusBadge'
import LayerToggle from '@/components/map/controls/LayerToggle'

interface DashboardHeaderProps {
  eventId: string
  locale: string
  activeLayers: Record<string, boolean>
  onLayersChange: (id: string, visible: boolean) => void
}

export default function DashboardHeader({
  eventId,
  locale,
  activeLayers,
  onLayersChange,
}: DashboardHeaderProps) {
  const router = useRouter()
  const otherLocale = locale === 'es' ? 'en' : 'es'

  return (
    <header style={{
      height: 48,
      backgroundColor: 'var(--color-panel)',
      borderBottom: '1px solid var(--color-slate)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      gap: '1rem',
      position: 'relative',
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'var(--font-headline)',
        fontSize: '0.875rem',
        fontWeight: 700,
        color: 'var(--color-green)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}>
        <span style={{ color: 'var(--color-cyan)', marginRight: 2 }}>▌</span>
        GEOVIGIL SAR
        <span style={{ color: 'var(--color-cyan)', marginLeft: 2 }}>▐</span>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-slate)' }} />

      {/* Event tag */}
      <div style={{
        fontFamily: 'var(--font-hud)',
        fontSize: '0.625rem',
        color: 'var(--color-text)',
        letterSpacing: '0.1em',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ color: 'var(--color-muted)' }}>[</span>
        <span style={{ color: 'var(--color-cyan)' }}>{eventId}</span>
        <span style={{ color: 'var(--color-muted)' }}>]</span>
        <span>EVENTO ACTIVO</span>
      </div>

      {/* Live badge */}
      <StatusBadge status="live" label="EN VIVO" />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Locale toggle */}
        <button
          onClick={() => router.push(`/${otherLocale}`)}
          style={{
            fontFamily: 'var(--font-hud)',
            fontSize: '0.625rem',
            letterSpacing: '0.15em',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            gap: '0.25rem',
            alignItems: 'center',
          }}
        >
          <span style={{ color: locale === 'es' ? 'var(--color-green)' : 'var(--color-muted)' }}>ES</span>
          <span style={{ color: 'var(--color-slate)' }}>|</span>
          <span style={{ color: locale === 'en' ? 'var(--color-green)' : 'var(--color-muted)' }}>EN</span>
        </button>

        {/* Layer toggle */}
        <LayerToggle layers={activeLayers} onChange={onLayersChange} />

        {/* Export button */}
        <button style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.625rem',
          color: 'var(--color-muted)',
          letterSpacing: '0.15em',
          background: 'none',
          border: '1px solid var(--color-slate)',
          padding: '0.25rem 0.625rem',
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}>
          EXPORTAR
        </button>
      </div>
    </header>
  )
}
