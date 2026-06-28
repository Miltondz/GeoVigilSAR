'use client'

import { useState } from 'react'
import { getCachedZone, setCachedZone, type ZoneSnapshot } from '@/lib/zone-cache'

interface ViewportBbox {
  minLat: number; maxLat: number; minLng: number; maxLng: number
}

interface ZoneAnalyzeButtonProps {
  viewportBbox: ViewportBbox | null
  onSnapshot: (snapshot: ZoneSnapshot) => void
  hasSnapshot: boolean
  snapshotAge?: number   // ms since last fetch
}

export default function ZoneAnalyzeButton({ viewportBbox, onSnapshot, hasSnapshot, snapshotAge }: ZoneAnalyzeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)

  const analyze = async () => {
    if (!viewportBbox || loading) return
    setError(false)

    const { minLat, maxLat, minLng, maxLng } = viewportBbox
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2

    // Check cache first (20-min TTL)
    const cached = getCachedZone(minLat, maxLat, minLng, maxLng)
    if (cached) {
      onSnapshot(cached)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        lat:    centerLat.toFixed(4),
        lng:    centerLng.toFixed(4),
        minLat: minLat.toFixed(4),
        maxLat: maxLat.toFixed(4),
        minLng: minLng.toFixed(4),
        maxLng: maxLng.toFixed(4),
      })
      const res = await fetch(`/api/zone-analyze?${params.toString()}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()

      const snap = setCachedZone(minLat, maxLat, minLng, maxLng, {
        zone:      data.zone,
        news:      data.news      ?? [],
        reports:   data.reports   ?? [],
        images:    data.images    ?? [],
        aiExtract: data.aiExtract ?? null,
        fetchedAt: data.fetchedAt ?? Date.now(),
      })
      onSnapshot(snap)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const ageMin = snapshotAge ? Math.floor(snapshotAge / 60000) : null

  return (
    <button
      onClick={analyze}
      disabled={loading || !viewportBbox}
      title={hasSnapshot
        ? `Datos de zona · hace ${ageMin}min · clic para actualizar`
        : 'Analizar zona actual — noticias + humanitario'
      }
      style={{
        fontFamily:      'var(--font-hud)',
        fontSize:        '0.5625rem',
        letterSpacing:   '0.14em',
        color:           error ? 'var(--color-red)'
                       : hasSnapshot ? 'var(--color-green)'
                       : 'var(--color-cyan)',
        background:      'rgba(0,10,15,0.85)',
        border:          `1px solid ${error ? 'var(--color-red)'
                       : hasSnapshot ? 'var(--color-green)'
                       : 'var(--color-slate)'}`,
        padding:         '0.25rem 0.625rem',
        cursor:          loading || !viewportBbox ? 'default' : 'pointer',
        display:         'flex',
        alignItems:      'center',
        gap:             '0.35rem',
        opacity:         loading || !viewportBbox ? 0.6 : 1,
        transition:      'all 0.15s',
        backdropFilter:  'blur(4px)',
        pointerEvents:   'all',
      }}
    >
      {loading ? (
        <>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
          ANALIZANDO...
        </>
      ) : error ? (
        <>⚠ ERROR · REINTENTAR</>
      ) : hasSnapshot ? (
        <>⊕ ZONA · {ageMin}min</>
      ) : (
        <>⊕ ANALIZAR ZONA</>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </button>
  )
}
