'use client'

import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/ui/StatusBadge'
import LayerToggle from '@/components/map/controls/LayerToggle'
import EventSelector from '@/components/EventSelector'
import ExportMenu from '@/components/ui/ExportMenu'
import ZoneSearch from '@/components/map/controls/ZoneSearch'
import DateFilter, { type DateRange } from '@/components/map/controls/DateFilter'
import ViewModeToggle from '@/components/map/controls/ViewModeToggle'
import VisionModeControl from '@/components/map/controls/VisionModeControl'
import type { VisionMode } from '@/components/map/overlays/VisionModeOverlay'
import { getEvent } from '@/lib/events/index'

interface DashboardHeaderProps {
  eventId: string
  locale: string
  activeLayers: Record<string, boolean>
  onLayersChange: (id: string, visible: boolean) => void
  onEventChange: (eventId: string) => void
  onZoomTo?: (lat: number, lng: number, name: string) => void
  onSitrepOpen?: () => void
  onDataSourcesOpen?: () => void
  onSystemHealthOpen?: () => void
  onSavedEventsOpen?: () => void
  dateFilter: DateRange
  onDateFilterChange: (v: DateRange) => void
  viewportBbox?: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null
  viewMode: '2d' | '3d'
  onViewModeChange: (m: '2d' | '3d') => void
  visionMode: VisionMode
  onVisionModeChange: (m: VisionMode) => void
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
  onZoomTo,
  onSitrepOpen,
  onDataSourcesOpen,
  onSystemHealthOpen,
  onSavedEventsOpen,
  dateFilter,
  onDateFilterChange,
  viewportBbox,
  viewMode,
  onViewModeChange,
  visionMode,
  onVisionModeChange,
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
      <EventSelector activeEventId={eventId} onSelect={onEventChange} viewportBbox={viewportBbox} />

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

      <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-slate)', flexShrink: 0 }} />

      <DateFilter
        value={dateFilter}
        minDate="2026-06-24"
        onChange={onDateFilterChange}
      />

      <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-slate)', flexShrink: 0 }} />

      <VisionModeControl mode={visionMode} onChange={onVisionModeChange} />

      <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-slate)', flexShrink: 0 }} />

      <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />

      <div style={{ flex: 1 }} />

      {/* Controls right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {/* Saved events */}
        {onSavedEventsOpen && (
          <button
            onClick={onSavedEventsOpen}
            title="Eventos guardados"
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.6875rem',
              letterSpacing: '0.12em',
              color: 'var(--color-amber)',
              background: 'none',
              border: '1px solid var(--color-amber)',
              padding: '0.25rem 0.625rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            ◈ EVENTOS
          </button>
        )}

        {/* Zone search */}
        <ZoneSearch
          onResult={r => onZoomTo?.(r.lat, r.lng, r.name)}
          placeholder={locale === 'es' ? 'BUSCAR ZONA...' : 'SEARCH ZONE...'}
        />

        {/* System health / connections button */}
        {onSystemHealthOpen && (
          <button
            onClick={onSystemHealthOpen}
            title="Estado de conexiones"
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.625rem',
              letterSpacing: '0.15em',
              color: 'var(--color-green)',
              background: 'none',
              border: '1px solid var(--color-green)',
              padding: '0.25rem 0.625rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <span style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: 'var(--color-green)',
              boxShadow: '0 0 4px var(--color-green)',
              display: 'inline-block',
            }} />
            SYS
          </button>
        )}

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

        {/* DATA SOURCES button */}
        {onDataSourcesOpen && (
          <button
            onClick={onDataSourcesOpen}
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.625rem',
              letterSpacing: '0.15em',
              color: 'var(--color-cyan)',
              background: 'none',
              border: '1px solid var(--color-cyan)',
              padding: '0.25rem 0.625rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            DATA SOURCES
          </button>
        )}

        {/* SITREP button */}
        {onSitrepOpen && (
          <button
            onClick={onSitrepOpen}
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.625rem',
              letterSpacing: '0.15em',
              color: 'var(--color-amber)',
              background: 'none',
              border: '1px solid var(--color-amber)',
              padding: '0.25rem 0.625rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            SITREP
          </button>
        )}

        <ExportMenu
          eventId={eventId}
          earthquakes={earthquakes}
          stats={{ eventId, timestamp: Date.now() }}
        />
      </div>
    </header>
  )
}
