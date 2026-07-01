'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export interface HealthResult {
  id: string
  group: string
  name: string
  status: 'ok' | 'warn' | 'error' | 'timeout'
  latencyMs: number
  httpStatus?: number
  error?: string
}

const STATUS_COLOR: Record<HealthResult['status'], string> = {
  ok:      '#00FF88',
  warn:    '#FFB800',
  error:   '#FF4444',
  timeout: '#FFB800',
}

const STATUS_LABEL: Record<HealthResult['status'], string> = {
  ok:      'ONLINE',
  warn:    'WARN',
  error:   'ERROR',
  timeout: 'TIMEOUT',
}

const STATIC_SOURCES = [
  { name: 'EMSR884 AOI GeoJSON', note: 'public/geojson/' },
  { name: 'Fault Lines DB (USGS)', note: 'static vector' },
  { name: 'Hospital Dataset (OSM)', note: 'static JSON' },
]

function LatencyText({ ms, fontSize = '0.5rem' }: { ms: number; fontSize?: string }) {
  const text = ms > 999 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  const color = ms > 4000 ? '#FF4444' : ms > 2000 ? '#FFB800' : '#607080'
  return <span style={{ color, fontFamily: "'Share Tech Mono', monospace", fontSize }}>{text}</span>
}

function StatusDot({ status, size = 7 }: { status: HealthResult['status']; size?: number }) {
  const color = STATUS_COLOR[status]
  const pulse = status === 'ok' ? 'sysHealthPulse 3s ease-in-out infinite' : 'none'
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: color,
      flexShrink: 0,
      boxShadow: `0 0 4px ${color}`,
      animation: pulse,
    }} />
  )
}

// ── Shared fetch/stream logic ────────────────────────────────────────────────

function useHealthChecks() {
  const [results, setResults] = useState<HealthResult[]>([])
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  const runChecks = useCallback(async () => {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    setLoading(true)
    setResults([])

    try {
      const res = await fetch('/api/health', { cache: 'no-store', signal: abort.signal })
      if (!res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          const t = line.trim()
          if (!t) continue
          try {
            const r = JSON.parse(t) as HealthResult
            setResults(prev => {
              const idx = prev.findIndex(x => x.id === r.id)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = r
                return next
              }
              return [...prev, r]
            })
          } catch { /* ignore malformed */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      if (!abort.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void runChecks()
    return () => abortRef.current?.abort()
  }, [runChecks])

  return { results, loading, runChecks }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SystemHealthModalProps {
  onClose: () => void
  autoClose?: boolean
  /** 'modal' = centered boot-sequence dialog (auto-closes). 'panel' = docked sidebar, toggled from header. */
  variant?: 'modal' | 'panel'
}

const EXPECTED_TOTAL = 16

export default function SystemHealthModal({ onClose, autoClose = true, variant = 'modal' }: SystemHealthModalProps) {
  const { results, loading, runChecks } = useHealthChecks()
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }

  // Auto-dismiss after checks complete (modal variant only)
  useEffect(() => {
    if (variant !== 'modal' || loading || !autoClose) return
    setCountdown(8)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearCountdown()
          onClose()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return clearCountdown
  }, [variant, loading, autoClose, onClose])

  const groups = results.reduce<Record<string, HealthResult[]>>((acc, r) => {
    if (!acc[r.group]) acc[r.group] = []
    acc[r.group].push(r)
    return acc
  }, {})

  const okCount    = results.filter(r => r.status === 'ok').length
  const failCount  = results.filter(r => r.status === 'error' || r.status === 'timeout').length
  const warnCount  = results.filter(r => r.status === 'warn').length

  if (variant === 'panel') {
    return (
      <div style={{
        position: 'fixed',
        top: 48,
        right: 0,
        width: 300,
        height: 'calc(100vh - 88px)',
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
          <div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem', color: 'var(--color-cyan)', letterSpacing: '0.15em' }}>
              FUENTES DE DATOS
            </div>
            {results.length > 0 && (
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.4375rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>
                <span style={{ color: '#00FF88' }}>{okCount} ONLINE</span>
                {warnCount > 0 && <span style={{ color: '#FFB800' }}> · {warnCount} AVISO</span>}
                {failCount > 0 && <span style={{ color: '#FF4444' }}> · {failCount} ERROR</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => void runChecks()}
              disabled={loading}
              style={{
                background: 'none',
                border: '1px solid var(--color-slate)',
                color: loading ? 'var(--color-muted)' : 'var(--color-cyan)',
                cursor: loading ? 'default' : 'pointer',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.4375rem',
                padding: '0.15rem 0.4rem',
                letterSpacing: '0.1em',
              }}
            >
              {loading ? '···' : '↺ REINTENTAR'}
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1 }}
              aria-label="Cerrar panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem' }}>
          {loading && results.length === 0 && (
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem', color: 'var(--color-muted)', padding: '1rem 0' }}>
              VERIFICANDO FUENTES...
            </div>
          )}

          {Object.entries(groups).map(([group, rows]) => (
            <div key={group} style={{ marginBottom: '0.75rem' }}>
              <div style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.4375rem',
                color: 'var(--color-muted)',
                letterSpacing: '0.15em',
                marginBottom: '0.25rem',
                paddingBottom: '0.2rem',
                borderBottom: '1px solid var(--color-slate)',
              }}>
                {group}
              </div>
              {rows.map(r => (
                <div key={r.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.3rem 0',
                  borderBottom: '1px solid rgba(26,58,74,0.4)',
                }}>
                  <StatusDot status={r.status} size={6} />
                  <span style={{
                    flex: 1,
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: '0.5rem',
                    color: '#E0E8F0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {r.name}
                  </span>
                  {r.httpStatus && (
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.4375rem', color: '#607080' }}>
                      {r.httpStatus}
                    </span>
                  )}
                  <span style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: '0.4375rem',
                    color: STATUS_COLOR[r.status],
                    letterSpacing: '0.08em',
                    flexShrink: 0,
                    minWidth: 42,
                    textAlign: 'right',
                  }}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  <LatencyText ms={r.latencyMs} fontSize="0.4375rem" />
                </div>
              ))}
            </div>
          ))}

          {/* Static sources not in health check */}
          {results.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.4375rem',
                color: 'var(--color-muted)',
                letterSpacing: '0.15em',
                marginBottom: '0.25rem',
                paddingBottom: '0.2rem',
                borderBottom: '1px solid var(--color-slate)',
              }}>
                ESTÁTICAS
              </div>
              {STATIC_SOURCES.map(s => (
                <div key={s.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.3rem 0',
                  borderBottom: '1px solid rgba(26,58,74,0.4)',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#00FF88', boxShadow: '0 0 4px #00FF88', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: "'Share Tech Mono', monospace", fontSize: '0.5rem', color: '#E0E8F0' }}>{s.name}</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.4375rem', color: '#607080' }}>{s.note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Modal variant — boot-sequence dialog ──────────────────────────────────

  const progressPct  = loading
    ? Math.min(95, Math.round((results.length / EXPECTED_TOTAL) * 100))
    : 100
  const progressColor = failCount > 0 ? '#FF4444' : warnCount > 0 ? '#FFB800' : '#00FF88'

  const summaryText = loading
    ? `VERIFICANDO ${results.length}/${EXPECTED_TOTAL} FUENTES...`
    : failCount > 0
      ? `${okCount} ONLINE  ${warnCount > 0 ? `${warnCount} AVISO  ` : ''}${failCount} ERROR`
      : warnCount > 0
        ? `${okCount} ONLINE  ${warnCount} AVISO`
        : `TODAS LAS FUENTES OPERATIVAS — ${okCount} ONLINE`

  return (
    <>
      <style>{`
        @keyframes sysHealthFadeSlide {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes sysHealthPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #00FF88; }
          50%       { opacity: 0.5; box-shadow: 0 0 2px #00FF88; }
        }
        @keyframes sysHealthBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes sysHealthSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .sys-health-row {
          animation: sysHealthFadeSlide 0.2s ease both;
        }
        .sys-health-group-sep {
          border-bottom: 1px solid rgba(26,58,74,0.6);
        }
      `}</style>

      <div
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,8,14,0.88)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Share Tech Mono', monospace",
          backdropFilter: 'blur(3px)',
        }}
      >
        {/* Panel */}
        <div style={{
          width: 580,
          backgroundColor: 'var(--color-panel)',
          border: '1px solid var(--color-slate)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}>

          {/* HUD corners */}
          {[
            { top: 0, left: 0, borderTop: '2px solid #00FF88', borderLeft: '2px solid #00FF88' },
            { top: 0, right: 0, borderTop: '2px solid #00FF88', borderRight: '2px solid #00FF88' },
            { bottom: 0, left: 0, borderBottom: '2px solid #00FF88', borderLeft: '2px solid #00FF88' },
            { bottom: 0, right: 0, borderBottom: '2px solid #00FF88', borderRight: '2px solid #00FF88' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 10, height: 10, ...s }} />
          ))}

          {/* Header */}
          <div style={{
            padding: '0.5rem 0.75rem',
            borderBottom: '1px solid var(--color-slate)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}>
            <div>
              <div style={{ fontSize: '0.45rem', color: 'var(--color-muted)', letterSpacing: '0.2em' }}>
                GEOVIGIL SAR // SECUENCIA DE INICIALIZACIÓN // VERIFICACIÓN DE CONEXIONES
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-green)', letterSpacing: '0.12em', marginTop: 5, fontWeight: 700 }}>
                ESTADO DE FUENTES DE DATOS
              </div>
              <div style={{
                fontSize: '0.5rem',
                color: failCount > 0 ? '#FF4444' : warnCount > 0 ? '#FFB800' : '#00B4FF',
                letterSpacing: '0.1em',
                marginTop: 3,
                animation: loading ? 'sysHealthBlink 1.2s step-start infinite' : 'none',
              }}>
                {summaryText}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.5rem',
                color: 'var(--color-muted)',
                background: 'none',
                border: '1px solid var(--color-slate)',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                letterSpacing: '0.1em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                lineHeight: 1.6,
              }}
            >
              [ ESC ]
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 2, backgroundColor: 'rgba(26,58,74,0.5)', flexShrink: 0 }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              backgroundColor: progressColor,
              transition: 'width 0.4s ease, background-color 0.3s ease',
              boxShadow: `0 0 6px ${progressColor}`,
            }} />
          </div>

          {/* Results — 2-column grid, no scroll */}
          <div style={{ padding: '0.125rem 0' }}>

            {/* Loading state */}
            {loading && results.length === 0 && (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  fontSize: '0.5rem', color: 'var(--color-cyan)', letterSpacing: '0.2em',
                }}>
                  <div style={{
                    width: 8, height: 8,
                    border: '1.5px solid #00B4FF', borderTopColor: 'transparent',
                    borderRadius: '50%', animation: 'sysHealthSpin 0.8s linear infinite',
                  }} />
                  INICIANDO VERIFICACIÓN...
                </div>
              </div>
            )}

            {/* Groups: label spans full width, items in 2-col grid */}
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div style={{
                  padding: '0.2rem 0.75rem 0.125rem',
                  fontSize: '0.4rem', color: 'var(--color-muted)', letterSpacing: '0.22em',
                  borderBottom: '1px solid rgba(26,58,74,0.5)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <span>{group}</span>
                  <span style={{ flex: 1, borderTop: '1px dashed rgba(26,58,74,0.4)', height: 0 }} />
                  <span style={{ fontSize: '0.38rem' }}>{items.length}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  {items.map((r, idx) => (
                    <div
                      key={r.id}
                      className="sys-health-row"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.175rem 0.625rem',
                        borderBottom: '1px solid rgba(26,58,74,0.15)',
                        borderRight: idx % 2 === 0 ? '1px solid rgba(26,58,74,0.3)' : 'none',
                        animationDelay: `${idx * 35}ms`,
                        minWidth: 0,
                      }}
                    >
                      <StatusDot status={r.status} />
                      <span style={{
                        flex: 1, fontSize: '0.5rem', minWidth: 0,
                        color: r.status === 'error' ? 'rgba(255,68,68,0.85)' : 'var(--color-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        letterSpacing: '0.02em',
                      }}>
                        {r.name}
                      </span>
                      <span style={{
                        fontSize: '0.43rem', color: STATUS_COLOR[r.status],
                        letterSpacing: '0.08em', flexShrink: 0,
                      }}>
                        {STATUS_LABEL[r.status]}
                      </span>
                      <span style={{ flexShrink: 0 }}>
                        <LatencyText ms={r.latencyMs} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid var(--color-slate)',
            padding: '0.3rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexShrink: 0,
          }}>
            {/* Left: retry */}
            <div>
              {!loading && failCount > 0 && (
                <button
                  onClick={() => void runChecks()}
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: '0.5rem',
                    color: '#FFB800',
                    background: 'none',
                    border: '1px solid #FFB800',
                    padding: '0.25rem 0.625rem',
                    cursor: 'pointer',
                    letterSpacing: '0.1em',
                    lineHeight: 1.6,
                  }}
                >
                  ↺ REINTENTAR ({failCount})
                </button>
              )}
              {loading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.45rem',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.1em',
                }}>
                  <div style={{
                    width: 6, height: 6,
                    border: '1px solid #00B4FF',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'sysHealthSpin 0.8s linear infinite',
                  }} />
                  VERIFICANDO...
                </div>
              )}
            </div>

            {/* Right: countdown + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {countdown !== null && countdown > 0 && (
                <div style={{
                  fontSize: '0.43rem',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.1em',
                }}>
                  AUTO-CERRAR {countdown}s
                </div>
              )}
              <button
                onClick={onClose}
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '0.5rem',
                  color: 'var(--color-green)',
                  background: 'none',
                  border: '1px solid var(--color-green)',
                  padding: '0.25rem 0.75rem',
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  lineHeight: 1.6,
                }}
              >
                [ CONTINUAR ]
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
