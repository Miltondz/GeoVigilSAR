'use client'

import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/ui/StatusBadge'
import LayerToggle from '@/components/map/controls/LayerToggle'
import EventSelector from '@/components/EventSelector'
import ExportMenu from '@/components/ui/ExportMenu'
import { getEvent } from '@/lib/events/index'

interface DashboardHeaderProps {
  eventId: string
  locale: string
  activeLayers: Record<string, boolean>
  onLayersChange: (id: string, visible: boolean) => void
  onEventChange: (eventId: string) => void
  earthquakes?: {
    id: string; magnitude: number; depth: number; lat: number; lng: number
    time: number; place: string; classification: string
  }[]
}

export default function DashboardHeader({
  eventId,
  locale,
  activeLayers,
  onLayersChange,
  onEventChange,
  earthquakes = [],
}: DashboardHeaderProps) {
  const router = useRouter()
  const otherLocale = locale === 'es' ? 'en' : 'es'
  const event = getEvent(eventId)

  return (
    <header style={{
      height: 48,
      backgroundColor: 'var(--color-panel)',
      borderBottom: '1px solid var(--color-slate)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      gap: '0.75rem',
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
        display: 'flex',
        alignItems: 'center',
        gap: '0.2rem',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ color: 'var(--color-cyan)' }}>▌</span>
        GEOVIGIL SAR
        <span style={{ color: 'var(--color-cyan)' }}>▐</span>
      </div>

      <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-slate)', flexShrink: 0 }} />

      {/* Event selector */}
      <EventSelector activeEventId={eventId} onSelect={onEventChange} />

      {/* Event label */}
      <div style={{
        fontFamily: 'var(--font-hud)',
        fontSize: '0.5rem',
        color: 'var(--color-muted)',
        letterSpacing: '0.08em',
        display: 'none',
      }}>
        {event.faultSystem}
      </div>

      {/* Live badge */}
      <StatusBadge status={event.status === 'active' ? 'live' : 'offline'} label={event.status === 'active' ? 'EN VIVO' : 'ARCHIVO'} />

      <div style={{ flex: 1 }} />

      {/* Controls right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
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
            gap: '0.2rem',
            alignItems: 'center',
          }}
        >
          <span style={{ color: locale === 'es' ? 'var(--color-green)' : 'var(--color-muted)' }}>ES</span>
          <span style={{ color: 'var(--color-slate)' }}>|</span>
          <span style={{ color: locale === 'en' ? 'var(--color-green)' : 'var(--color-muted)' }}>EN</span>
        </button>

        <LayerToggle layers={activeLayers} onChange={onLayersChange} />

        <ExportMenu
          eventId={eventId}
          earthquakes={earthquakes}
          stats={{ eventId, timestamp: Date.now() }}
        />
      </div>
    </header>
  )
}
