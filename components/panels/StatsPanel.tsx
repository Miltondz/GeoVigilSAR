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

export default function StatsPanel({
  eventId,
  stats,
  mainShocks,
  location,
  faultSystem,
  dataStream,
  onHospitalDetailOpen,
}: StatsPanelProps) {
  const streamRef = useRef<HTMLDivElement>(null)
  const [hospitalOpen, setHospitalOpen] = useState(false)
  const [hospitalCounts, setHospitalCounts] = useState<HospitalCounts | null>(null)

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = 0
    }
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
      width: 240,
      height: '100%',
      backgroundColor: 'var(--color-panel)',
      borderRight: '1px solid var(--color-slate)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Event header */}
      <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-slate)' }}>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.375rem' }}>
          EVENTO ACTIVO
        </div>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.875rem', color: 'var(--color-green)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
          {eventId}
        </div>
        <div style={{ borderTop: '1px solid var(--color-slate)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
          {mainShocks.map((shock, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <PulseRing magnitude={shock.magnitude} size={12} />
              <div>
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--color-red)', letterSpacing: '0.05em' }}>
                  M{shock.magnitude}
                </span>
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', marginLeft: '0.375rem' }}>
                  {shock.timeStr}
                </span>
              </div>
            </div>
          ))}
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', marginTop: '0.25rem', lineHeight: 1.5 }}>
            {location} · {faultSystem}
          </div>
        </div>
      </div>

      {/* Stats bars */}
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

        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            ÚLTIMA RÉPLICA
          </div>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-text)' }}>
            M{stats.lastAftershock.magnitude} · hace {stats.lastAftershock.hoursAgo}h · {stats.lastAftershock.place}
          </div>
        </div>
      </div>

      {/* Data stream */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.5rem',
          color: 'var(--color-muted)',
          letterSpacing: '0.15em',
          padding: '0.5rem 0.75rem 0.25rem',
        }}>
          FLUJO DE DATOS
        </div>
        <div
          ref={streamRef}
          style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 0.75rem' }}
        >
          {dataStream.map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '0.375rem',
              marginBottom: '0.375rem',
              alignItems: 'baseline',
            }}>
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                &gt;
              </span>
              <div>
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: streamColor[item.type] }}>
                  {item.text}
                </span>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)' }}>
                  {item.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hospitals section ─────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--color-slate)', flexShrink: 0 }}>
        {/* Collapsible header */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setHospitalOpen(o => !o)}
          onKeyDown={e => e.key === 'Enter' && setHospitalOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.15em' }}>
            HOSPITALES
          </span>
          <span style={{ color: 'var(--color-muted)', fontSize: '0.5rem' }}>
            {hospitalOpen ? '▲' : '▼'}
          </span>
        </div>

        {hospitalOpen && (
          <div style={{ padding: '0 0.75rem 0.75rem' }}>
            {hospitalCounts ? (
              <>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                  Total: {hospitalCounts.total}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.45rem', color: 'var(--color-green)' }}>
                    ● {hospitalCounts.green} VERDE
                  </span>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.45rem', color: 'var(--color-amber)' }}>
                    ● {hospitalCounts.amber} ÁMBAR
                  </span>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.45rem', color: 'var(--color-red)' }}>
                    ● {hospitalCounts.red} ROJO
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
                      fontSize: '0.45rem',
                      letterSpacing: '0.1em',
                      padding: '2px 8px',
                      width: '100%',
                    }}
                  >
                    VER DETALLE
                  </button>
                )}
              </>
            ) : (
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.45rem', color: 'var(--color-muted)' }}>
                CARGANDO...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
