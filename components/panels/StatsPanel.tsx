'use client'

import { useEffect, useRef, useState } from 'react'
import DataBar from '@/components/ui/DataBar'
import PulseRing from '@/components/ui/PulseRing'

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
}: StatsPanelProps) {
  const streamRef   = useRef<HTMLDivElement>(null)
  const [hospitalOpen, setHospitalOpen]     = useState(false)
  const [hospitalCounts, setHospitalCounts] = useState<HospitalCounts | null>(null)

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
