'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  loadSavedEvents, removeSavedEvent, togglePin, toggleArchive,
  sortedEvents, SAVED_EVENTS_CHANGE_EVENT, type SavedEvent,
} from '@/lib/saved-events'

interface SavedEventsPanelProps {
  visible: boolean
  onClose: () => void
  onSelect: (ev: SavedEvent) => void
}

function magColor(m: number): string {
  if (m >= 7.0) return 'var(--color-red)'
  if (m >= 5.5) return 'var(--color-amber)'
  if (m >= 3.5) return 'var(--color-cyan)'
  return 'var(--color-muted)'
}

function timeLabel(ms: number): string {
  const d = new Date(ms)
  return d.toISOString().slice(0, 10)
}

interface ActionBtnProps {
  onClick: () => void
  title: string
  active?: boolean
  activeColor?: string
  children: React.ReactNode
}

function ActionBtn({ onClick, title, active, activeColor = 'var(--color-green)', children }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.25rem',
        fontFamily: 'var(--font-hud)',
        fontSize: '0.75rem',
        color: active ? activeColor : 'var(--color-muted)',
        lineHeight: 1,
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = activeColor }}
      onMouseLeave={e => { e.currentTarget.style.color = active ? activeColor : 'var(--color-muted)' }}
    >
      {children}
    </button>
  )
}

export default function SavedEventsPanel({ visible, onClose, onSelect }: SavedEventsPanelProps) {
  const [events, setEvents]         = useState<SavedEvent[]>([])
  const [showArchived, setShowArchived] = useState(false)

  const reload = useCallback(() => setEvents(sortedEvents(loadSavedEvents())), [])

  useEffect(() => {
    if (visible) reload()
  }, [visible, reload])

  // Refresh when any component mutates saved events (same-tab custom event)
  useEffect(() => {
    window.addEventListener(SAVED_EVENTS_CHANGE_EVENT, reload)
    return () => window.removeEventListener(SAVED_EVENTS_CHANGE_EVENT, reload)
  }, [reload])

  const activeEvents   = events.filter(e => !e.archived)
  const archivedEvents = events.filter(e => e.archived)

  if (!visible) return null

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: 380,
      height: '100%',
      backgroundColor: 'var(--color-panel)',
      borderRight: '1px solid var(--color-slate)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 80,
      boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
    }}>

      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--color-slate)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.2em', marginBottom: '0.125rem' }}>
            PANEL DE SEGUIMIENTO
          </div>
          <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1rem', color: 'var(--color-green)', fontWeight: 700, letterSpacing: '0.06em' }}>
            Eventos Guardados
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '1rem', lineHeight: 1, padding: '0.25rem' }}
        >
          ✕
        </button>
      </div>

      {/* Count bar */}
      <div style={{
        padding: '0.375rem 1rem',
        borderBottom: '1px solid var(--color-slate)',
        display: 'flex',
        gap: '1rem',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)' }}>
          {activeEvents.filter(e => e.pinned).length} <span style={{ color: 'var(--color-amber)' }}>⬆ fijados</span>
        </span>
        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)' }}>
          {activeEvents.length} activos
        </span>
        {archivedEvents.length > 0 && (
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)' }}>
            {archivedEvents.length} archivados
          </span>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>

        {/* Active events */}
        {activeEvents.map(ev => (
          <EventRow
            key={ev.id}
            ev={ev}
            onSelect={() => onSelect(ev)}
            onPin={() => { setEvents(sortedEvents(togglePin(ev.id))) }}
            onArchive={() => { setEvents(sortedEvents(toggleArchive(ev.id))) }}
            onRemove={() => { setEvents(sortedEvents(removeSavedEvent(ev.id))) }}
          />
        ))}

        {activeEvents.length === 0 && (
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
              Sin eventos guardados
            </div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-muted)', opacity: 0.6 }}>
              Selecciona un sismo en el mapa y usa el botón ◈ para guardarlo
            </div>
          </div>
        )}

        {/* Archived section */}
        {archivedEvents.length > 0 && (
          <>
            <button
              onClick={() => setShowArchived(o => !o)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                borderTop: '1px solid var(--color-slate)',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.5rem',
              }}
            >
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.15em' }}>
                ARCHIVADOS ({archivedEvents.length})
              </span>
              <span style={{ fontSize: '0.5rem', color: 'var(--color-muted)' }}>
                {showArchived ? '▲' : '▼'}
              </span>
            </button>

            {showArchived && archivedEvents.map(ev => (
              <EventRow
                key={ev.id}
                ev={ev}
                onSelect={() => onSelect(ev)}
                onPin={() => { setEvents(sortedEvents(togglePin(ev.id))) }}
                onArchive={() => { setEvents(sortedEvents(toggleArchive(ev.id))) }}
                onRemove={() => { setEvents(sortedEvents(removeSavedEvent(ev.id))) }}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '0.5rem 1rem',
        borderTop: '1px solid var(--color-slate)',
        fontFamily: 'var(--font-hud)',
        fontSize: '0.5rem',
        color: 'var(--color-muted)',
        flexShrink: 0,
        lineHeight: 1.6,
      }}>
        Clic en evento → volar al sitio · ⬆ fijar al tope · ◫ archivar · ✕ eliminar
      </div>
    </div>
  )
}

// ── Event row ──────────────────────────────────────────────────────────────────

interface EventRowProps {
  ev: SavedEvent
  onSelect: () => void
  onPin: () => void
  onArchive: () => void
  onRemove: () => void
}

function EventRow({ ev, onSelect, onPin, onArchive, onRemove }: EventRowProps) {
  const color = magColor(ev.magnitude)

  return (
    <div style={{
      borderBottom: '1px solid rgba(26,58,74,0.6)',
      backgroundColor: ev.archived ? 'rgba(0,0,0,0.2)' : 'transparent',
      opacity: ev.archived ? 0.6 : 1,
    }}>
      {/* Pinned badge */}
      {ev.pinned && (
        <div style={{
          padding: '0.125rem 1rem',
          fontFamily: 'var(--font-hud)',
          fontSize: '0.4375rem',
          color: 'var(--color-amber)',
          letterSpacing: '0.2em',
          backgroundColor: 'rgba(255,184,0,0.05)',
        }}>
          ⬆ FIJADO
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Magnitude bar */}
        <div style={{
          width: 4,
          backgroundColor: color,
          opacity: ev.archived ? 0.4 : 0.7,
          flexShrink: 0,
        }} />

        {/* Main content — clickable */}
        <button
          onClick={onSelect}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.625rem 0.75rem',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color, fontWeight: 700, lineHeight: 1 }}>
              M{ev.magnitude.toFixed(1)}
            </span>
            {ev.eventId && (
              <span style={{
                fontFamily: 'var(--font-hud)',
                fontSize: '0.5rem',
                color: 'var(--color-green)',
                border: '1px solid var(--color-green)',
                padding: '0 4px',
                letterSpacing: '0.1em',
                lineHeight: '14px',
              }}>
                {ev.eventId}
              </span>
            )}
          </div>

          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--color-text)', marginBottom: '0.25rem', lineHeight: 1.4 }}>
            {ev.label}
          </div>

          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', lineHeight: 1.4 }}>
            {ev.place}
          </div>

          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.75rem' }}>
            <span>{timeLabel(ev.time)}</span>
            <span>{ev.lat.toFixed(2)}°{ev.lat >= 0 ? 'N' : 'S'} · {Math.abs(ev.lng).toFixed(2)}°{ev.lng >= 0 ? 'E' : 'W'}</span>
            <span>Prof. {ev.depth}km</span>
          </div>
        </button>

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0.25rem 0.5rem',
          gap: '0.25rem',
          flexShrink: 0,
        }}>
          <ActionBtn
            onClick={onPin}
            title={ev.pinned ? 'Quitar pin' : 'Fijar al tope'}
            active={ev.pinned}
            activeColor="var(--color-amber)"
          >
            ⬆
          </ActionBtn>
          <ActionBtn
            onClick={onArchive}
            title={ev.archived ? 'Restaurar' : 'Archivar'}
            active={ev.archived}
            activeColor="var(--color-cyan)"
          >
            ◫
          </ActionBtn>
          <ActionBtn
            onClick={onRemove}
            title="Eliminar"
            activeColor="var(--color-red)"
          >
            ✕
          </ActionBtn>
        </div>
      </div>
    </div>
  )
}
