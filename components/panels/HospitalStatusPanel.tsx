'use client'

import { useState } from 'react'
import type { HospitalWithDistance } from '@/app/api/hospitals/route'

interface AIResult {
  status: 'GREEN' | 'AMBER' | 'RED'
  summary: string
  confidence: number
}

interface HospitalStatusPanelProps {
  visible: boolean
  onClose: () => void
  eventId: string
  hospitals: HospitalWithDistance[]
  onSelectHospital?: (lat: number, lng: number, id: string, name: string) => void
}

const statusBadge: Record<'GREEN' | 'AMBER' | 'RED', { label: string; color: string; bg: string }> = {
  GREEN: { label: 'OPERATIVO',    color: '#000A0F', bg: 'var(--color-green)' },
  AMBER: { label: 'LIMITADO',     color: '#000A0F', bg: 'var(--color-amber)' },
  RED:   { label: 'NO OPERATIVO', color: '#ffffff', bg: 'var(--color-red)'   },
}

export default function HospitalStatusPanel({ visible, onClose, eventId, hospitals, onSelectHospital }: HospitalStatusPanelProps) {
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [aiResults, setAiResults] = useState<Record<string, AIResult>>({})
  const loading = hospitals.length === 0

  async function analyzeHospital(osmId: string) {
    setAnalyzing(osmId)
    try {
      const res = await fetch('/api/hospital-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId: osmId }),
      })
      const data = (await res.json()) as AIResult
      setAiResults(prev => ({ ...prev, [osmId]: data }))
    } catch {
      setAiResults(prev => ({
        ...prev,
        [osmId]: { status: 'AMBER', summary: 'Estado desconocido', confidence: 0 },
      }))
    } finally {
      setAnalyzing(null)
    }
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        width: 300,
        backgroundColor: 'var(--color-panel)',
        borderRight: '1px solid var(--color-slate)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '0.75rem',
        borderBottom: '1px solid var(--color-slate)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.15em' }}>
          HOSPITALES · {eventId}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-hud)',
            fontSize: '0.625rem',
            letterSpacing: '0.1em',
            padding: '0.125rem 0.25rem',
          }}
        >
          ✕ CERRAR
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {loading && (
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', padding: '0.5rem' }}>
            CARGANDO...
          </div>
        )}

        {!loading && hospitals.length === 0 && (
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', padding: '0.5rem' }}>
            Sin datos
          </div>
        )}

        {!loading && hospitals.map(h => {
          const aiResult = aiResults[h.osmId]
          const currentStatus = aiResult?.status ?? h.status
          const badge = statusBadge[currentStatus]
          const isAnalyzing = analyzing === h.osmId

          return (
            <div
              key={h.osmId}
              onClick={() => onSelectHospital?.(h.lat, h.lng, h.osmId, h.name)}
              style={{
                padding: '0.5rem',
                borderBottom: '1px solid var(--color-slate)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                cursor: onSelectHospital ? 'pointer' : 'default',
              }}
            >
              {/* Name */}
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.625rem', color: 'var(--color-text)', lineHeight: 1.3 }}>
                {h.name}
              </div>

              {/* Distance + Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>
                  {h.distanceKm} km del epicentro
                </span>
                <span style={{
                  fontFamily: 'var(--font-hud)',
                  fontSize: '0.45rem',
                  color: badge.color,
                  backgroundColor: badge.bg,
                  padding: '1px 4px',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}>
                  {badge.label}
                </span>
              </div>

              {/* AI summary */}
              {aiResult && (
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.5rem', color: 'var(--color-muted)', lineHeight: 1.4 }}>
                  {aiResult.summary}
                  <span style={{ marginLeft: 4, color: 'var(--color-cyan)' }}>
                    ({Math.round(aiResult.confidence * 100)}%)
                  </span>
                </div>
              )}

              {/* Analyze button */}
              <button
                onClick={() => analyzeHospital(h.osmId)}
                disabled={isAnalyzing}
                style={{
                  alignSelf: 'flex-start',
                  background: 'none',
                  border: '1px solid var(--color-slate)',
                  color: isAnalyzing ? 'var(--color-muted)' : 'var(--color-cyan)',
                  cursor: isAnalyzing ? 'default' : 'pointer',
                  fontFamily: 'var(--font-hud)',
                  fontSize: '0.45rem',
                  letterSpacing: '0.1em',
                  padding: '2px 6px',
                  marginTop: '0.125rem',
                }}
              >
                {isAnalyzing ? 'ANALIZANDO...' : 'ANALIZAR CON IA'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
