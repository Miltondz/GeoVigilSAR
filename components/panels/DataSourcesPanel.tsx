'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface HealthResult {
  id: string
  group: string
  name: string
  status: 'ok' | 'warn' | 'error' | 'timeout'
  latencyMs: number
  httpStatus?: number
  error?: string
}

interface DataSourcesPanelProps {
  visible: boolean
  onClose: () => void
  eventId: string
}

const STATUS_DOT: Record<HealthResult['status'], { color: string; label: string }> = {
  ok:      { color: '#00FF88', label: 'ONLINE'  },
  warn:    { color: '#FFB800', label: 'WARN'    },
  error:   { color: '#FF4444', label: 'ERROR'   },
  timeout: { color: '#FFB800', label: 'TIMEOUT' },
}

function LatencyBadge({ ms }: { ms: number }) {
  const color = ms > 4000 ? '#FF4444' : ms > 2000 ? '#FFB800' : '#607080'
  const text  = ms > 999  ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  return (
    <span style={{ color, fontFamily: "'Share Tech Mono', monospace", fontSize: '0.4375rem' }}>
      {text}
    </span>
  )
}

function Row({ r }: { r: HealthResult }) {
  const { color, label } = STATUS_DOT[r.status]
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.3rem 0',
      borderBottom: '1px solid rgba(26,58,74,0.4)',
    }}>
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 4px ${color}`,
        flexShrink: 0,
      }} />
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
        color,
        letterSpacing: '0.08em',
        flexShrink: 0,
        minWidth: 42,
        textAlign: 'right',
      }}>
        {label}
      </span>
      <LatencyBadge ms={r.latencyMs} />
    </div>
  )
}

export default function DataSourcesPanel({ visible, onClose }: DataSourcesPanelProps) {
  const [results, setResults]   = useState<HealthResult[]>([])
  const [loading, setLoading]   = useState(false)
  const abortRef                = useRef<AbortController | null>(null)

  const runChecks = useCallback(async () => {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setLoading(true)
    setResults([])

    try {
      const res = await fetch('/api/health', { cache: 'no-store', signal: abort.signal })
      if (!res.body) return
      const reader  = res.body.getReader()
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
              if (idx >= 0) { const n = [...prev]; n[idx] = r; return n }
              return [...prev, r]
            })
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      if (!abort.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    void runChecks()
    return () => { abortRef.current?.abort() }
  }, [visible, runChecks])

  if (!visible) return null

  const groups = results.reduce<Record<string, HealthResult[]>>((acc, r) => {
    if (!acc[r.group]) acc[r.group] = []
    acc[r.group].push(r)
    return acc
  }, {})

  const okCount      = results.filter(r => r.status === 'ok').length
  const warnCount    = results.filter(r => r.status === 'warn' || r.status === 'timeout').length
  const errorCount   = results.filter(r => r.status === 'error').length

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
              {errorCount > 0 && <span style={{ color: '#FF4444' }}> · {errorCount} ERROR</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={runChecks}
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
            {rows.map(r => <Row key={r.id} r={r} />)}
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
            {[
              { name: 'EMSR884 AOI GeoJSON', note: 'public/geojson/' },
              { name: 'Fault Lines DB (USGS)', note: 'static vector' },
              { name: 'Hospital Dataset (OSM)', note: 'static JSON' },
            ].map(s => (
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
