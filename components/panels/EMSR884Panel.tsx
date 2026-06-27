'use client'

import { useEffect, useState } from 'react'
import type { Emsr884Activation, VtProductLayer } from '@/lib/emsr884'
import { PRODUCT_TYPE_LABEL, VERSION_STATUS_LABEL, VERSION_STATUS_COLOR } from '@/lib/emsr884'

interface EMSR884PanelProps {
  visible: boolean
  onClose: () => void
}

interface ApiResponse {
  activation: Emsr884Activation | null
  vtLayers: VtProductLayer[]
  error?: string
  lastUpdated?: number
}

const PANEL_W = 400

export default function EMSR884Panel({ visible, onClose }: EMSR884PanelProps) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible || data) return
    setLoading(true)
    fetch('/api/emsr884')
      .then(r => r.json())
      .then((d: ApiResponse) => setData(d))
      .catch(() => setData({ activation: null, vtLayers: [], error: 'Fetch failed' }))
      .finally(() => setLoading(false))
  }, [visible, data])

  if (!visible) return null

  const act = data?.activation
  const vtCount = data?.vtLayers.length ?? 0

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: PANEL_W,
      height: '100%',
      backgroundColor: 'var(--color-panel)',
      borderLeft: '1px solid var(--color-slate)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      fontFamily: "'Share Tech Mono', monospace",
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.625rem 0.875rem',
        borderBottom: '1px solid var(--color-slate)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '0.5rem',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '0.45rem', color: 'var(--color-muted)', letterSpacing: '0.2em' }}>
            COPERNICUS EMS // RAPID MAPPING
          </div>
          <div style={{ fontSize: '0.75rem', color: '#FF4444', letterSpacing: '0.1em', marginTop: 3, fontWeight: 700 }}>
            EMSR884
          </div>
          <div style={{ fontSize: '0.5rem', color: 'var(--color-muted)', marginTop: 2 }}>
            {act?.name ?? 'Venezuela Earthquake 2026'}
          </div>
        </div>
        <button onClick={onClose} style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '0.5rem',
          color: 'var(--color-muted)',
          background: 'none',
          border: '1px solid var(--color-slate)',
          padding: '0.2rem 0.5rem',
          cursor: 'pointer',
          flexShrink: 0,
        }}>
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.625rem 0' }}>

        {loading && (
          <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.5rem', color: 'var(--color-cyan)', letterSpacing: '0.15em' }}>
            CARGANDO DATOS...
          </div>
        )}

        {data?.error && !act && (
          <div style={{ padding: '1rem', fontSize: '0.5rem', color: '#FF4444', letterSpacing: '0.08em' }}>
            ERROR: {data.error}
          </div>
        )}

        {act && (
          <>
            {/* Activation metadata */}
            <Section label="ACTIVACIÓN">
              <Row label="Código"    value={act.code} />
              <Row label="Evento"    value={act.eventTime ? new Date(act.eventTime).toLocaleString('es-VE', { timeZone: 'America/Caracas' }) : '—'} />
              <Row label="Activada"  value={act.activationTime ? new Date(act.activationTime).toLocaleString('es-VE', { timeZone: 'America/Caracas' }) : '—'} />
              <Row label="País"      value={act.countries?.map(c => c.name).join(', ') ?? '—'} />
              <Row label="Categoría" value={act.category ?? '—'} />
              <Row label="Estado"    value={act.closed ? 'CERRADA' : 'ACTIVA'} valueColor={act.closed ? '#607080' : '#00FF88'} />
            </Section>

            {/* VT layer summary */}
            {vtCount > 0 && (
              <Section label="CAPAS VECTORIALES EN MAPA">
                <div style={{ padding: '0.25rem 0', fontSize: '0.5rem', color: 'var(--color-cyan)', letterSpacing: '0.08em' }}>
                  {vtCount} capa{vtCount !== 1 ? 's' : ''} cargada{vtCount !== 1 ? 's' : ''} — activa el toggle EMSR884 PRODUCTOS
                </div>
                {data?.vtLayers.map(vt => (
                  <div key={vt.id} style={{
                    padding: '0.25rem 0',
                    borderBottom: '1px solid rgba(26,58,74,0.3)',
                    fontSize: '0.5rem',
                  }}>
                    <div style={{ color: 'var(--color-text)', letterSpacing: '0.05em' }}>
                      {vt.layerName}
                    </div>
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.43rem', marginTop: 1 }}>
                      {vt.aoiName} · {PRODUCT_TYPE_LABEL[vt.productType] ?? vt.productType}
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {vtCount === 0 && !loading && (
              <Section label="CAPAS VECTORIALES">
                <div style={{ fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.06em', lineHeight: 1.6 }}>
                  Sin capas VT disponibles aún. Los productos aparecen cuando el procesamiento finaliza (status F).
                </div>
              </Section>
            )}

            {/* AOIs + products */}
            {(act.aois ?? []).map(aoi => (
              <Section key={aoi.number} label={`AOI ${String(aoi.number).padStart(2, '0')} — ${aoi.name.replace(/EMSR884\/AOI\d+\s*-\s*/i, '')}`}>
                {(aoi.products ?? []).length === 0 && (
                  <div style={{ fontSize: '0.45rem', color: 'var(--color-muted)' }}>Sin productos</div>
                )}
                {(aoi.products ?? []).map((prod, pi) => {
                  const statusCode  = prod.version?.statusCode ?? '—'
                  const statusLabel = VERSION_STATUS_LABEL[statusCode] ?? statusCode
                  const statusColor = VERSION_STATUS_COLOR[statusCode] ?? '#607080'
                  const typeLabel   = PRODUCT_TYPE_LABEL[prod.type] ?? prod.type
                  const sensors     = (prod.images ?? []).map(img => img.sensorName ?? img.sensorType).filter(Boolean).join(', ')

                  return (
                    <div key={pi} style={{
                      borderBottom: '1px solid rgba(26,58,74,0.35)',
                      paddingBottom: '0.375rem',
                      marginBottom: '0.375rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 3 }}>
                        <span style={{
                          fontSize: '0.43rem',
                          color: statusColor,
                          border: `1px solid ${statusColor}`,
                          padding: '1px 4px',
                          letterSpacing: '0.1em',
                        }}>
                          {prod.type}
                        </span>
                        <span style={{ fontSize: '0.5rem', color: 'var(--color-text)', flex: 1 }}>
                          {typeLabel}
                        </span>
                        <span style={{ fontSize: '0.43rem', color: statusColor }}>
                          {statusLabel}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.43rem', color: 'var(--color-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span>Factible: <span style={{ color: prod.feasible ? '#00FF88' : '#607080' }}>{prod.feasible ? 'Sí' : 'No'}</span></span>
                        {sensors && <span>Sensor: <span style={{ color: 'var(--color-cyan)' }}>{sensors}</span></span>}
                        {prod.version?.deliveryTime && (
                          <span>Entrega: {new Date(prod.version.deliveryTime).toLocaleDateString('es-VE')}</span>
                        )}
                      </div>

                      {/* Download links */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4, flexWrap: 'wrap' }}>
                        {prod.downloadPath && (
                          <a
                            href={prod.downloadPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.43rem',
                              color: '#00B4FF',
                              textDecoration: 'none',
                              border: '1px solid rgba(0,180,255,0.4)',
                              padding: '1px 6px',
                              letterSpacing: '0.08em',
                            }}
                          >
                            ↓ ZIP
                          </a>
                        )}
                        {(prod.layers ?? []).filter(l => l.type === 'json').map((l, li) => (
                          <a
                            key={li}
                            href={`${act.aws_bucket?.replace(/\/$/, '')}/${l.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.43rem',
                              color: '#00FF88',
                              textDecoration: 'none',
                              border: '1px solid rgba(0,255,136,0.4)',
                              padding: '1px 6px',
                              letterSpacing: '0.08em',
                            }}
                          >
                            ↓ GeoJSON
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </Section>
            ))}

            {/* Info bulletins */}
            {(act.infobulletins ?? []).length > 0 && (
              <Section label="BOLETINES">
                {(act.infobulletins ?? []).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'block',
                    fontSize: '0.45rem',
                    color: '#00B4FF',
                    textDecoration: 'none',
                    padding: '0.2rem 0',
                    letterSpacing: '0.04em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    ↗ Boletín {i + 1}
                  </a>
                ))}
              </Section>
            )}

            {/* Data credits */}
            <div style={{
              padding: '0.75rem 0.875rem',
              fontSize: '0.4rem',
              color: 'var(--color-muted)',
              letterSpacing: '0.06em',
              lineHeight: 1.6,
              borderTop: '1px solid var(--color-slate)',
            }}>
              Datos: © European Union, Copernicus Emergency Management Service — EMSR884.
              Uso libre bajo licencia CC BY 4.0.
              {data?.lastUpdated && (
                <span> Actualizado: {new Date(data.lastUpdated).toLocaleTimeString()}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '0.375rem 0.875rem 0.375rem', marginBottom: '0.125rem' }}>
      <div style={{
        fontSize: '0.43rem',
        color: 'var(--color-muted)',
        letterSpacing: '0.2em',
        borderBottom: '1px solid rgba(26,58,74,0.5)',
        paddingBottom: '0.25rem',
        marginBottom: '0.375rem',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.15rem 0',
      fontSize: '0.5rem',
      borderBottom: '1px solid rgba(26,58,74,0.2)',
      gap: '0.5rem',
    }}>
      <span style={{ color: 'var(--color-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ color: valueColor ?? 'var(--color-text)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    </div>
  )
}
