'use client'

import { useState } from 'react'
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
  isMobile?: boolean
  viewMode: '2d' | '3d'
  onViewModeChange: (m: '2d' | '3d') => void
  visionMode: VisionMode
  onVisionModeChange: (m: VisionMode) => void
  earthquakes?: {
    id: string; magnitude: number; depth: number; lat: number; lng: number
    time: number; place: string; classification: string
  }[]
}

const BTN = {
  fontFamily: 'var(--font-hud)',
  fontSize: '0.625rem',
  letterSpacing: '0.12em',
  background: 'none',
  border: '1px solid',
  padding: '0.375rem 0.75rem',
  cursor: 'pointer',
  textTransform: 'uppercase' as const,
  width: '100%',
  textAlign: 'left' as const,
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
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
  isMobile = false,
  viewMode,
  onViewModeChange,
  visionMode,
  onVisionModeChange,
  earthquakes = [],
}: DashboardHeaderProps) {
  const router = useRouter()
  const otherLocale = locale === 'es' ? 'en' : 'es'
  const event = getEvent(eventId)
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <header style={{
        height: 48,
        backgroundColor: 'var(--color-panel)',
        borderBottom: '1px solid var(--color-slate)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 0.75rem',
        gap: isMobile ? '0.5rem' : '0.75rem',
        position: 'relative',
        zIndex: 200,
        flexShrink: 0,
      }}>
        {/* Logo — abbreviated on mobile */}
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
          flexShrink: 0,
        }}>
          <span style={{ color: 'var(--color-cyan)' }}>▌</span>
          {isMobile ? 'GVS' : 'GEOVIGIL SAR'}
          <span style={{ color: 'var(--color-cyan)' }}>▐</span>
        </div>

        {/* Desktop: event selector + controls inline */}
        {!isMobile && (
          <>
            <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-slate)', flexShrink: 0 }} />
            <EventSelector activeEventId={eventId} onSelect={onEventChange} viewportBbox={viewportBbox} />
            <StatusBadge status={event.status === 'active' ? 'live' : 'offline'} label={event.status === 'active' ? 'EN VIVO' : 'ARCHIVO'} />
            <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-slate)', flexShrink: 0 }} />
            <DateFilter value={dateFilter} minDate="2026-06-24" onChange={onDateFilterChange} />
            <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-slate)', flexShrink: 0 }} />
            <VisionModeControl mode={visionMode} onChange={onVisionModeChange} />
            <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-slate)', flexShrink: 0 }} />
            <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
          </>
        )}

        {/* Mobile: live dot + 2D/3D + hamburger */}
        {isMobile && (
          <>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              backgroundColor: event.status === 'active' ? 'var(--color-green)' : 'var(--color-muted)',
              boxShadow: event.status === 'active' ? '0 0 6px var(--color-green)' : 'none',
            }} />
            <div style={{ flex: 1 }} />
            <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menú"
              style={{
                background: menuOpen ? 'rgba(0,255,136,0.12)' : 'none',
                border: `1px solid ${menuOpen ? 'var(--color-green)' : 'var(--color-slate)'}`,
                color: menuOpen ? 'var(--color-green)' : 'var(--color-text)',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1,
                flexShrink: 0,
                borderRadius: 2,
              }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </>
        )}

        {/* Desktop right-side controls */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            {onSavedEventsOpen && (
              <button onClick={onSavedEventsOpen} title="Eventos guardados" style={{
                fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', letterSpacing: '0.12em',
                color: 'var(--color-amber)', background: 'none', border: '1px solid var(--color-amber)',
                padding: '0.25rem 0.625rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                ◈ EVENTOS
              </button>
            )}
            <ZoneSearch onResult={r => onZoomTo?.(r.lat, r.lng, r.name)} placeholder={locale === 'es' ? 'BUSCAR ZONA...' : 'SEARCH ZONE...'} />
            {onSystemHealthOpen && (
              <button onClick={onSystemHealthOpen} title="Estado de conexiones" style={{
                fontFamily: 'var(--font-hud)', fontSize: '0.625rem', letterSpacing: '0.15em',
                color: 'var(--color-green)', background: 'none', border: '1px solid var(--color-green)',
                padding: '0.25rem 0.625rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--color-green)', boxShadow: '0 0 4px var(--color-green)', display: 'inline-block' }} />
                SYS
              </button>
            )}
            <button onClick={() => router.push(`/${otherLocale}`)} style={{
              fontFamily: 'var(--font-hud)', fontSize: '0.625rem', letterSpacing: '0.15em',
              background: 'none', border: 'none', cursor: 'pointer', display: 'flex', gap: '0.2rem', alignItems: 'center',
            }}>
              <span style={{ color: locale === 'es' ? 'var(--color-green)' : 'var(--color-muted)' }}>ES</span>
              <span style={{ color: 'var(--color-slate)' }}>|</span>
              <span style={{ color: locale === 'en' ? 'var(--color-green)' : 'var(--color-muted)' }}>EN</span>
            </button>
            <LayerToggle layers={activeLayers} onChange={onLayersChange} />
            {onDataSourcesOpen && (
              <button onClick={onDataSourcesOpen} style={{
                fontFamily: 'var(--font-hud)', fontSize: '0.625rem', letterSpacing: '0.15em',
                color: 'var(--color-cyan)', background: 'none', border: '1px solid var(--color-cyan)',
                padding: '0.25rem 0.625rem', cursor: 'pointer', textTransform: 'uppercase',
              }}>
                DATA SOURCES
              </button>
            )}
            {onSitrepOpen && (
              <button onClick={onSitrepOpen} style={{
                fontFamily: 'var(--font-hud)', fontSize: '0.625rem', letterSpacing: '0.15em',
                color: 'var(--color-amber)', background: 'none', border: '1px solid var(--color-amber)',
                padding: '0.25rem 0.625rem', cursor: 'pointer', textTransform: 'uppercase',
              }}>
                SITREP
              </button>
            )}
            <ExportMenu eventId={eventId} earthquakes={earthquakes} stats={{ eventId, timestamp: Date.now() }} />
          </div>
        )}
      </header>

      {/* Mobile slide-down menu */}
      {isMobile && menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeMenu}
            style={{
              position: 'fixed', inset: 0, top: 48,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 190,
            }}
          />

          {/* Menu panel */}
          <div style={{
            position: 'fixed', top: 48, left: 0, right: 0,
            backgroundColor: 'var(--color-panel)',
            borderBottom: '1px solid var(--color-slate)',
            zIndex: 195,
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxHeight: 'calc(100dvh - 48px)',
            overflowY: 'auto',
          }}>

            {/* Event selector */}
            <div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.12em', marginBottom: '0.375rem' }}>EVENTO</div>
              <EventSelector activeEventId={eventId} onSelect={id => { onEventChange(id); closeMenu() }} viewportBbox={viewportBbox} />
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--color-slate)' }} />

            {/* Date filter */}
            <div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.12em', marginBottom: '0.375rem' }}>FILTRO TEMPORAL</div>
              <DateFilter value={dateFilter} minDate="2026-06-24" onChange={onDateFilterChange} />
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--color-slate)' }} />

            {/* Layer toggle */}
            <div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.12em', marginBottom: '0.375rem' }}>CAPAS</div>
              <LayerToggle layers={activeLayers} onChange={onLayersChange} />
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--color-slate)' }} />

            {/* Vision mode */}
            <div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.12em', marginBottom: '0.375rem' }}>MODO VISIÓN</div>
              <VisionModeControl mode={visionMode} onChange={onVisionModeChange} />
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--color-slate)' }} />

            {/* Zone search */}
            <div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.12em', marginBottom: '0.375rem' }}>BUSCAR ZONA</div>
              <ZoneSearch onResult={r => { onZoomTo?.(r.lat, r.lng, r.name); closeMenu() }} placeholder={locale === 'es' ? 'BUSCAR ZONA...' : 'SEARCH ZONE...'} />
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--color-slate)' }} />

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {onSavedEventsOpen && (
                <button onClick={() => { onSavedEventsOpen(); closeMenu() }} style={{ ...BTN, borderColor: 'var(--color-amber)', color: 'var(--color-amber)' }}>
                  ◈ EVENTOS GUARDADOS
                </button>
              )}
              {onSystemHealthOpen && (
                <button onClick={() => { onSystemHealthOpen(); closeMenu() }} style={{ ...BTN, borderColor: 'var(--color-green)', color: 'var(--color-green)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--color-green)', boxShadow: '0 0 4px var(--color-green)', display: 'inline-block', flexShrink: 0 }} />
                  ESTADO DE SISTEMA
                </button>
              )}
              {onDataSourcesOpen && (
                <button onClick={() => { onDataSourcesOpen(); closeMenu() }} style={{ ...BTN, borderColor: 'var(--color-cyan)', color: 'var(--color-cyan)' }}>
                  ◉ FUENTES DE DATOS
                </button>
              )}
              {onSitrepOpen && (
                <button onClick={() => { onSitrepOpen(); closeMenu() }} style={{ ...BTN, borderColor: 'var(--color-amber)', color: 'var(--color-amber)' }}>
                  ▣ SITREP
                </button>
              )}
              <button onClick={() => { router.push(`/${otherLocale}`); closeMenu() }} style={{ ...BTN, borderColor: 'var(--color-slate)', color: 'var(--color-text)' }}>
                ⬡ IDIOMA: {otherLocale.toUpperCase()}
              </button>
            </div>

          </div>
        </>
      )}
    </>
  )
}
