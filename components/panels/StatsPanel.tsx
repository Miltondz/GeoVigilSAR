'use client'

import { useEffect, useRef, useState } from 'react'
import DataBar from '@/components/ui/DataBar'
import PulseRing from '@/components/ui/PulseRing'
import type { ZoneSnapshot } from '@/lib/zone-cache'

interface HospitalCounts {
  total: number
  green: number
  amber: number
  red: number
}

interface Stats {
  fatalities: number
  injured: number
  aftershockCount: number
  lastAftershock: { magnitude: number; place: string; hoursAgo: number }
}

interface StreamItem {
  time: string
  text: string
  type: 'seismic' | 'news' | 'system'
}

interface StatsPanelProps {
  eventId: string
  stats: Stats
  mainShocks: { magnitude: number; timeStr: string }[]
  location: string
  faultSystem: string
  dataStream: StreamItem[]
  onHospitalDetailOpen?: () => void
  zoneSnapshot?: ZoneSnapshot | null
  onClearZone?: () => void
}

const streamColor = {
  seismic: 'var(--color-amber)',
  news:    'var(--color-cyan)',
  system:  'var(--color-muted)',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>
      {children}
    </div>
  )
}

export default function StatsPanel({
  eventId,
  stats,
  mainShocks,
  location,
  faultSystem,
  dataStream,
  onHospitalDetailOpen,
  zoneSnapshot,
  onClearZone,
}: StatsPanelProps) {
  const streamRef   = useRef<HTMLDivElement>(null)
  const [hospitalOpen, setHospitalOpen]     = useState(false)
  const [hospitalCounts, setHospitalCounts] = useState<HospitalCounts | null>(null)
  const [zoneOpen, setZoneOpen]             = useState(true)

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = 0
  }, [dataStream])

  useEffect(() => {
    fetch(`/api/hospitals?eventId=${eventId}`)
      .then(r => r.json())
      .then((data: { status: 'GREEN' | 'AMBER' | 'RED' }[]) => {
        setHospitalCounts({
          total: data.length,
          green: data.filter(h => h.status === 'GREEN').length,
          amber: data.filter(h => h.status === 'AMBER').length,
          red:   data.filter(h => h.status === 'RED').length,
        })
      })
      .catch(() => {})
  }, [eventId])

  return (
    <div style={{
      width: 272,
      height: '100%',
      backgroundColor: 'var(--color-panel)',
      borderRight: '1px solid var(--color-slate)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>

      {/* ── Event header ─────────────────────────────────────────────── */}
      <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-slate)' }}>
        <Label>EVENTO ACTIVO</Label>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: 'var(--color-green)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          {eventId}
        </div>

        <div style={{ borderTop: '1px solid var(--color-slate)', paddingTop: '0.5rem' }}>
          {mainShocks.map((shock, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <PulseRing magnitude={shock.magnitude} size={14} />
              <div>
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: 'var(--color-red)', fontWeight: 700 }}>
                  M{shock.magnitude}
                </span>
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', marginLeft: '0.5rem' }}>
                  {shock.timeStr}
                </span>
              </div>
            </div>
          ))}
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-muted)', marginTop: '0.25rem', lineHeight: 1.6 }}>
            {location}
          </div>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', marginTop: '0.125rem', lineHeight: 1.5 }}>
            {faultSystem}
          </div>
        </div>
      </div>

      {/* ── Stats bars ────────────────────────────────────────────────── */}
      <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-slate)' }}>
        <DataBar
          value={stats.fatalities}
          max={500}
          label="BAJAS CONFIRMADAS"
          displayValue={`${stats.fatalities} †`}
          color="red"
        />
        <DataBar
          value={stats.injured}
          max={10000}
          label="HERIDOS"
          displayValue={`${stats.injured.toLocaleString('en-US')} ⚕`}
          color="amber"
        />
        <DataBar
          value={stats.aftershockCount}
          max={200}
          label="RÉPLICAS REGISTRADAS"
          displayValue={`${stats.aftershockCount} ≈`}
          color="cyan"
        />

        <div style={{ marginTop: '0.625rem' }}>
          <Label>ÚLTIMA RÉPLICA</Label>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.8125rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
            M{stats.lastAftershock.magnitude.toFixed(1)}
            <span style={{ color: 'var(--color-muted)', margin: '0 0.375rem' }}>·</span>
            {stats.lastAftershock.place}
          </div>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>
            hace {stats.lastAftershock.hoursAgo}h
          </div>
        </div>
      </div>

      {/* ── Data stream ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.5rem 0.75rem 0.25rem', borderBottom: '1px solid rgba(26,58,74,0.5)' }}>
          <Label>FLUJO DE DATOS EN VIVO</Label>
        </div>
        <div
          ref={streamRef}
          style={{ flex: 1, overflowY: 'auto', padding: '0.375rem 0.75rem 0.75rem' }}
        >
          {dataStream.length === 0 && (
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-muted)', padding: '0.5rem 0' }}>
              Esperando eventos...
            </div>
          )}
          {dataStream.map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '0.5rem',
              paddingBottom: '0.375rem',
              borderBottom: '1px solid rgba(26,58,74,0.4)',
              alignItems: 'flex-start',
            }}>
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: streamColor[item.type], flexShrink: 0, lineHeight: 1.4 }}>
                ›
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: streamColor[item.type], lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {item.text}
                </div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>
                  {item.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Zone snapshot section ────────────────────────────────────── */}
      {zoneSnapshot && (
        <div style={{ borderTop: '1px solid var(--color-slate)', flexShrink: 0 }}>
          <button
            onClick={() => setZoneOpen(o => !o)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              textAlign: 'left',
            }}
          >
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-cyan)', letterSpacing: '0.12em' }}>
              ⊕ {zoneSnapshot.zone.country.toUpperCase()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>
                {Math.floor((Date.now() - zoneSnapshot.fetchedAt) / 60000)}min
              </span>
              <button
                onClick={e => { e.stopPropagation(); onClearZone?.() }}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '0.625rem', padding: 0, lineHeight: 1 }}
                title="Limpiar datos de zona"
              >
                ✕
              </button>
              <span style={{ fontSize: '0.5rem', color: 'var(--color-muted)' }}>{zoneOpen ? '▲' : '▼'}</span>
            </div>
          </button>

          {zoneOpen && (
            <div style={{ padding: '0 0.75rem 0.75rem', maxHeight: 220, overflowY: 'auto' }}>

              {/* Reports */}
              {zoneSnapshot.reports.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.375rem' }}>
                    REPORTES HUMANITARIOS · {zoneSnapshot.reports.length}
                  </div>
                  {zoneSnapshot.reports.slice(0, 3).map(r => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-hud)',
                        fontSize: '0.625rem',
                        color: 'var(--color-text)',
                        textDecoration: 'none',
                        lineHeight: 1.4,
                        marginBottom: '0.375rem',
                        paddingBottom: '0.375rem',
                        borderBottom: '1px solid rgba(26,58,74,0.4)',
                      }}
                    >
                      <span style={{ color: 'var(--color-red)' }}>⊕ </span>
                      {r.title}
                      <div style={{ color: 'var(--color-muted)', fontSize: '0.5rem', marginTop: '0.125rem' }}>
                        {r.source} · {new Date(r.publishedAt).toISOString().slice(0, 10)}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* News */}
              {zoneSnapshot.news.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.375rem' }}>
                    NOTICIAS · {zoneSnapshot.news.length}
                  </div>
                  {zoneSnapshot.news.slice(0, 5).map((n, i) => (
                    <a
                      key={i}
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-hud)',
                        fontSize: '0.625rem',
                        color: 'var(--color-text)',
                        textDecoration: 'none',
                        lineHeight: 1.4,
                        marginBottom: '0.375rem',
                        paddingBottom: '0.375rem',
                        borderBottom: '1px solid rgba(26,58,74,0.4)',
                      }}
                    >
                      <span style={{ color: 'var(--color-cyan)' }}>› </span>
                      {n.title}
                      <div style={{ color: 'var(--color-muted)', fontSize: '0.5rem', marginTop: '0.125rem' }}>
                        {n.source} · {new Date(n.publishedAt).toISOString().slice(0, 10)}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {zoneSnapshot.news.length === 0 && zoneSnapshot.reports.length === 0 && (
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', padding: '0.5rem 0' }}>
                  Sin datos para esta zona.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Hospitals section ─────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--color-slate)', flexShrink: 0 }}>
        <button
          onClick={() => setHospitalOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            textAlign: 'left',
          }}
        >
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-muted)', letterSpacing: '0.12em' }}>
            ⊕ HOSPITALES
          </span>
          {hospitalCounts && (
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)' }}>
              {hospitalCounts.total} · {hospitalOpen ? '▲' : '▼'}
            </span>
          )}
          {!hospitalCounts && (
            <span style={{ fontSize: '0.5rem', color: 'var(--color-muted)' }}>{hospitalOpen ? '▲' : '▼'}</span>
          )}
        </button>

        {hospitalOpen && (
          <div style={{ padding: '0 0.75rem 0.75rem' }}>
            {hospitalCounts ? (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>●</span> {hospitalCounts.green} op.
                  </span>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-amber)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>●</span> {hospitalCounts.amber} limitado
                  </span>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-red)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>●</span> {hospitalCounts.red} crítico
                  </span>
                </div>
                {onHospitalDetailOpen && (
                  <button
                    onClick={onHospitalDetailOpen}
                    style={{
                      background: 'none',
                      border: '1px solid var(--color-slate)',
                      color: 'var(--color-cyan)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-hud)',
                      fontSize: '0.6875rem',
                      letterSpacing: '0.1em',
                      padding: '0.25rem 0.5rem',
                      width: '100%',
                    }}
                  >
                    VER DETALLE HOSPITALES
                  </button>
                )}
              </>
            ) : (
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-muted)' }}>
                CARGANDO...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
