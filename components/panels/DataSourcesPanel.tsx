'use client'

import { useEffect, useState, useCallback } from 'react'
import type { GdacsEvent } from '@/lib/gdacs'
import type { EmsActivation } from '@/lib/copernicus-ems'
import type { HotProject } from '@/lib/hotosm'

interface DataSourcesPanelProps {
  visible: boolean
  onClose: () => void
  eventId: string
}

interface GdacsData {
  events: GdacsEvent[]
  alertLevel: 'Red' | 'Orange' | 'Green' | 'Unknown'
  populationAffected: number
}

interface EmsData {
  activations: EmsActivation[]
  hasActive: boolean
}

interface HotData {
  projects: HotProject[]
  count: number
}

interface ReliefDisaster {
  id: number
  name: string
  date: string
  status: string
  glide: string
  type: string
}

interface ReliefData {
  disasters: ReliefDisaster[]
  hasActive: boolean
}

const ALERT_COLOR: Record<string, string> = {
  Red: 'var(--color-red)',
  Orange: 'var(--color-amber)',
  Green: 'var(--color-green)',
  Unknown: 'var(--color-muted)',
}

function formatPop(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-hud)',
      fontSize: '0.5rem',
      color: 'var(--color-muted)',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      marginBottom: '0.375rem',
    }}>
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-slate)',
      padding: '0.5rem 0.625rem',
      marginBottom: '0.5rem',
    }}>
      {children}
    </div>
  )
}

export default function DataSourcesPanel({ visible, onClose, eventId }: DataSourcesPanelProps) {
  const [gdacs, setGdacs] = useState<GdacsData | null>(null)
  const [ems, setEms] = useState<EmsData | null>(null)
  const [hot, setHot] = useState<HotData | null>(null)
  const [relief, setRelief] = useState<ReliefData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [gdacsRes, emsRes, hotRes, reliefRes] = await Promise.allSettled([
        fetch(`/api/gdacs?eventId=${eventId}`),
        fetch('/api/copernicus-ems?country=Venezuela'),
        fetch(`/api/hotosm?eventId=${eventId}`),
        fetch('/api/reliefweb-disasters?country=VEN'),
      ])

      if (gdacsRes.status === 'fulfilled' && gdacsRes.value.ok) {
        const d = (await gdacsRes.value.json()) as GdacsData
        setGdacs(d)
      }
      if (emsRes.status === 'fulfilled' && emsRes.value.ok) {
        const d = (await emsRes.value.json()) as EmsData
        setEms(d)
      }
      if (hotRes.status === 'fulfilled' && hotRes.value.ok) {
        const d = (await hotRes.value.json()) as HotData
        setHot(d)
      }
      if (reliefRes.status === 'fulfilled' && reliefRes.value.ok) {
        const d = (await reliefRes.value.json()) as ReliefData
        setRelief(d)
      }
    } catch {
      // silently fail — partial data is still shown
    } finally {
      setLoading(false)
    }
  }, [eventId])

  // Fetch on open
  useEffect(() => {
    if (!visible) return
    void fetchAll()
  }, [visible, fetchAll])

  // Poll GDACS every 5 min
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => {
      fetch(`/api/gdacs?eventId=${eventId}`)
        .then(r => r.json())
        .then((d: GdacsData) => setGdacs(d))
        .catch(() => {})
    }, 300_000)
    return () => clearInterval(id)
  }, [visible, eventId])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 48,
      right: 0,
      width: 280,
      height: 'calc(100vh - 88px)', // leave room for timeline
      backgroundColor: 'var(--color-panel)',
      borderLeft: '1px solid var(--color-slate)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 90,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid var(--color-slate)',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.5rem',
          color: 'var(--color-cyan)',
          letterSpacing: '0.15em',
        }}>
          FUENTES DE DATOS
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-muted)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            lineHeight: 1,
          }}
          aria-label="Cerrar panel"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {loading && (
          <div style={{
            fontFamily: 'var(--font-hud)',
            fontSize: '0.5rem',
            color: 'var(--color-muted)',
            marginBottom: '0.75rem',
          }}>
            CARGANDO...
          </div>
        )}

        {/* GDACS */}
        <SectionLabel>Alerta GDACS</SectionLabel>
        <Card>
          {gdacs ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <span style={{
                  fontFamily: 'var(--font-hud)',
                  fontSize: '0.625rem',
                  color: ALERT_COLOR[gdacs.alertLevel] ?? 'var(--color-muted)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                }}>
                  {gdacs.alertLevel.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>
                  {gdacs.events.length} evento{gdacs.events.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-text)' }}>
                Población afectada:&nbsp;
                <span style={{ color: 'var(--color-amber)' }}>{formatPop(gdacs.populationAffected)}</span>
              </div>
              {gdacs.events.slice(0, 2).map(e => (
                <div key={e.id} style={{
                  fontFamily: 'var(--font-hud)',
                  fontSize: '0.4375rem',
                  color: 'var(--color-muted)',
                  marginTop: '0.25rem',
                  lineHeight: 1.4,
                }}>
                  M{e.magnitude} · {e.country} · {e.alertLevel}
                </div>
              ))}
            </>
          ) : (
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>
              Sin activación registrada
            </span>
          )}
        </Card>

        {/* Copernicus EMS */}
        <SectionLabel>Activaciones Copernicus EMS</SectionLabel>
        <Card>
          {ems && ems.activations.length > 0 ? (
            <>
              <div style={{
                fontFamily: 'var(--font-hud)',
                fontSize: '0.5rem',
                color: ems.hasActive ? 'var(--color-green)' : 'var(--color-muted)',
                marginBottom: '0.375rem',
                letterSpacing: '0.08em',
              }}>
                {ems.hasActive ? '● ACTIVA' : '○ COMPLETADA'} · {ems.activations.length} activación{ems.activations.length !== 1 ? 'es' : ''}
              </div>
              {ems.activations.slice(0, 2).map(a => (
                <div key={a.activationId} style={{ marginBottom: '0.375rem' }}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--font-hud)',
                      fontSize: '0.5rem',
                      color: 'var(--color-cyan)',
                      textDecoration: 'none',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {a.activationId} ↗
                  </a>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)' }}>
                    {a.title} · {a.productCount} producto{a.productCount !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>
              Sin activación registrada
            </span>
          )}
        </Card>

        {/* HOT OSM */}
        <SectionLabel>Proyectos HOT OSM</SectionLabel>
        <Card>
          {hot && hot.projects.length > 0 ? (
            <>
              <div style={{
                fontFamily: 'var(--font-hud)',
                fontSize: '0.5rem',
                color: 'var(--color-text)',
                marginBottom: '0.375rem',
              }}>
                {hot.projects.length} proyecto{hot.projects.length !== 1 ? 's' : ''} activo{hot.projects.length !== 1 ? 's' : ''}
              </div>
              {hot.projects.slice(0, 3).map(p => (
                <div key={p.id} style={{ marginBottom: '0.375rem' }}>
                  <a
                    href={`https://tasks.hotosm.org/projects/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--font-hud)',
                      fontSize: '0.5rem',
                      color: 'var(--color-cyan)',
                      textDecoration: 'none',
                    }}
                  >
                    #{p.id} ↗
                  </a>
                  <div style={{
                    fontFamily: 'var(--font-hud)',
                    fontSize: '0.4375rem',
                    color: 'var(--color-muted)',
                    marginTop: '0.1rem',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.2rem' }}>
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-green)' }}>
                      {p.percentMapped}% mapeado
                    </span>
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-amber)' }}>
                      {p.percentValidated}% validado
                    </span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>
              Sin proyectos registrados
            </span>
          )}
        </Card>

        {/* ReliefWeb Disasters */}
        <SectionLabel>Desastres ReliefWeb</SectionLabel>
        <Card>
          {relief && relief.disasters.length > 0 ? (
            <>
              <div style={{
                fontFamily: 'var(--font-hud)',
                fontSize: '0.5rem',
                color: relief.hasActive ? 'var(--color-green)' : 'var(--color-muted)',
                marginBottom: '0.375rem',
                letterSpacing: '0.08em',
              }}>
                {relief.hasActive ? '● ACTIVO' : '○ HISTÓRICO'}
              </div>
              {relief.disasters.slice(0, 2).map(d => (
                <div key={d.id} style={{ marginBottom: '0.375rem' }}>
                  <a
                    href={`https://reliefweb.int/disaster/${d.glide || d.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--font-hud)',
                      fontSize: '0.5rem',
                      color: 'var(--color-cyan)',
                      textDecoration: 'none',
                    }}
                  >
                    {d.name || `Disaster #${d.id}`} ↗
                  </a>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', marginTop: '0.1rem' }}>
                    {d.glide && <span>{d.glide} · </span>}
                    {d.status && <span>{d.status.toUpperCase()}</span>}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>
              Sin registros
            </span>
          )}
        </Card>
      </div>
    </div>
  )
}
