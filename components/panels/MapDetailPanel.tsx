'use client'

import { useEffect, useState, useRef } from 'react'
import type { SelectedMapObject } from '@/lib/types/map-selection'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NewsItem {
  title: string
  source: string
  url: string
  publishedAt: number
}

interface MapillaryImage {
  id: string
  url: string
  capturedAt: string
}

interface MapDetailPanelProps {
  object: SelectedMapObject | null
  onClose: () => void
  eventId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ms: number) {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

function depthLabel(km: number) {
  if (km <= 70)  return 'SUPERFICIAL'
  if (km <= 300) return 'INTERMEDIO'
  return 'PROFUNDO'
}

function classLabel(c: string) {
  const MAP: Record<string, string> = {
    mainshock:  'CHOQUE PRINCIPAL',
    foreshock:  'PRESISMO',
    aftershock: 'RÉPLICA',
    earthquake: 'SISMO',
  }
  return MAP[c] ?? c.toUpperCase()
}

function placeKeyword(place: string) {
  // "5 km NW of Maiquetía, Venezuela" → "Maiquetía"
  const m = place.match(/of ([^,]+)/)
  return m ? m[1].trim() : place.split(',')[0].trim()
}

// ── Data hooks ────────────────────────────────────────────────────────────────

function usePlaceNews(keyword: string, eventId: string) {
  const [items, setItems] = useState<NewsItem[]>([])
  useEffect(() => {
    if (!keyword) return
    setItems([])
    fetch(`/api/news?eventId=${eventId}&place=${encodeURIComponent(keyword)}&limit=8`)
      .then(r => r.json())
      .then((d: { items?: NewsItem[] }) => setItems(d.items ?? []))
      .catch(() => {})
  }, [keyword, eventId])
  return items
}

function useMapillary(lat: number, lng: number, enabled: boolean) {
  const [before, setBefore] = useState<MapillaryImage[]>([])
  const [after, setAfter]   = useState<MapillaryImage[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return
    setLoading(true)
    setBefore([])
    setAfter([])
    const base = `/api/mapillary/images?lat=${lat}&lng=${lng}`
    Promise.all([
      fetch(`${base}&phase=before`).then(r => r.json()).then((d: { images?: MapillaryImage[] }) => setBefore(d.images ?? [])),
      fetch(`${base}&phase=after`).then(r => r.json()).then((d: { images?: MapillaryImage[] }) => setAfter(d.images ?? [])),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lat, lng, enabled])

  return { before, after, loading }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', letterSpacing: '0.12em' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: accent ?? 'var(--color-text)', letterSpacing: '0.06em', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  )
}

function NewsSection({ keyword, eventId }: { keyword: string; eventId: string }) {
  const items = usePlaceNews(keyword, eventId)
  return (
    <div style={{ borderTop: '1px solid var(--color-slate)', paddingTop: '0.625rem' }}>
      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
        NOTICIAS RELACIONADAS
      </div>
      {items.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>Sin noticias localizadas...</div>
      ) : items.slice(0, 5).map((n, i) => (
        <a key={i} href={n.url} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', marginBottom: '0.5rem' }}>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-text)', lineHeight: 1.4, marginBottom: 2 }}>
            {n.title}
          </div>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-cyan)' }}>
            {n.source} · {new Date(n.publishedAt).toISOString().slice(11, 16)} UTC
          </div>
        </a>
      ))}
    </div>
  )
}

function ImagesSection({ lat, lng }: { lat: number; lng: number }) {
  const { before, after, loading } = useMapillary(lat, lng, true)
  if (loading) return (
    <div style={{ borderTop: '1px solid var(--color-slate)', paddingTop: '0.625rem' }}>
      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', letterSpacing: '0.15em' }}>IMÁGENES ANTES/DESPUÉS</div>
      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', marginTop: '0.375rem' }}>Buscando imágenes Mapillary...</div>
    </div>
  )

  const hasBefore = before.length > 0
  const hasAfter  = after.length > 0
  if (!hasBefore && !hasAfter) return (
    <div style={{ borderTop: '1px solid var(--color-slate)', paddingTop: '0.625rem' }}>
      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.375rem' }}>IMÁGENES ANTES/DESPUÉS</div>
      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>Sin cobertura Mapillary en esta zona.</div>
    </div>
  )

  return (
    <div style={{ borderTop: '1px solid var(--color-slate)', paddingTop: '0.625rem' }}>
      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
        IMÁGENES ANTES/DESPUÉS — MAPILLARY
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
        {[{ label: 'ANTES', imgs: before, accent: 'var(--color-cyan)' }, { label: 'DESPUÉS', imgs: after, accent: 'var(--color-red)' }].map(({ label, imgs, accent }) => (
          <div key={label}>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: accent, letterSpacing: '0.1em', marginBottom: '0.25rem' }}>{label}</div>
            {imgs.length === 0
              ? <div style={{ height: 80, background: 'rgba(26,58,74,0.3)', border: '1px solid var(--color-slate)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)' }}>SIN IMAGEN</span>
                </div>
              : imgs.slice(0, 2).map(img => (
                  <a key={img.id} href={`https://www.mapillary.com/map/im/${img.id}`} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: '0.25rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`${label} ${img.capturedAt}`}
                      style={{ width: '100%', height: 70, objectFit: 'cover', border: `1px solid ${accent}`, opacity: 0.9 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.375rem', color: 'var(--color-muted)' }}>
                      {new Date(img.capturedAt).toISOString().slice(0, 10)}
                    </div>
                  </a>
                ))
            }
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function MapDetailPanel({ object, onClose, eventId }: MapDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const visible = object !== null

  // Click outside to close
  const handleBackdrop = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
  }

  if (!object) return null

  const isEq  = object.type === 'earthquake'
  const isDmg = object.type === 'damage'

  const keyword   = isEq ? placeKeyword(object.place) : isDmg ? object.address.split('—')[0].trim() : ''
  const typeColor = isEq
    ? (object.magnitude >= 6.5 ? 'var(--color-red)' : 'var(--color-amber)')
    : object.damageType === 'collapsed' ? 'var(--color-red)' : 'var(--color-amber)'
  const typeBadge = isEq
    ? `M ${object.magnitude.toFixed(1)} SISMO`
    : object.damageType === 'collapsed' ? 'COLAPSO ESTRUCTURAL' : object.damageType === 'damaged' ? 'DAÑO ESTRUCTURAL' : 'ZONA AFECTADA'
  const title     = isEq ? object.place : isDmg ? object.address : ''

  return (
    /* backdrop */
    <div
      onClick={handleBackdrop}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 45,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* panel */}
      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 340,
          height: '100%',
          backgroundColor: 'rgba(0,26,36,0.97)',
          borderLeft: `1px solid ${typeColor}`,
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s ease',
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* header */}
        <div style={{
          padding: '0.625rem 0.75rem',
          borderBottom: '1px solid var(--color-slate)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'inline-block',
              fontFamily: 'var(--font-hud)',
              fontSize: '0.4375rem',
              color: typeColor,
              border: `1px solid ${typeColor}`,
              padding: '0.1rem 0.4rem',
              letterSpacing: '0.12em',
              marginBottom: '0.375rem',
            }}>
              {typeBadge}
            </div>
            <div style={{
              fontFamily: 'var(--font-headline)',
              fontSize: '0.75rem',
              color: 'var(--color-text)',
              lineHeight: 1.3,
              fontWeight: 600,
            }}>
              {title}
            </div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>
              {object.lat.toFixed(4)}°N {Math.abs(object.lng).toFixed(4)}°W
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-hud)',
              fontSize: '0.75rem',
              padding: '0 0.25rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* ── earthquake metadata ── */}
          {isEq && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <MetaCell label="MAGNITUD"      value={`M ${object.magnitude.toFixed(1)}`} accent={typeColor} />
              <MetaCell label="PROFUNDIDAD"   value={`${object.depth} km — ${depthLabel(object.depth)}`} />
              <MetaCell label="CLASIFICACIÓN" value={classLabel(object.classification)} />
              <MetaCell label="HORA UTC"      value={fmtTime(object.time).slice(11, 19)} />
              <MetaCell label="FECHA"         value={fmtTime(object.time).slice(0, 10)} />
              <MetaCell label="ID USGS"       value={object.id.slice(0, 12)} accent="var(--color-muted)" />
            </div>
          )}

          {/* ── damage metadata ── */}
          {isDmg && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                <MetaCell
                  label="TIPO DE DAÑO"
                  value={object.damageType === 'collapsed' ? 'COLAPSADO' : object.damageType === 'damaged' ? 'DAÑADO' : 'DESCONOCIDO'}
                  accent={typeColor}
                />
                <MetaCell label="EDIFICACIÓN" value={(object.buildingType ?? 'DESCONOCIDO').toUpperCase()} />
              </div>

              {/* SAR confidence bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', letterSpacing: '0.12em' }}>CONFIANZA SAR</span>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: typeColor }}>{Math.round(object.sarConfidence * 100)}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--color-slate)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%',
                    width: `${object.sarConfidence * 100}%`,
                    background: typeColor,
                    borderRadius: 2,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>

              <ImagesSection lat={object.lat} lng={object.lng} />
            </>
          )}

          {/* ── USGS external link for earthquakes ── */}
          {isEq && (
            <a
              href={`https://earthquake.usgs.gov/earthquakes/eventpage/${object.id}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                fontFamily: 'var(--font-hud)',
                fontSize: '0.5rem',
                color: 'var(--color-cyan)',
                border: '1px solid var(--color-slate)',
                padding: '0.25rem 0.5rem',
                textDecoration: 'none',
                letterSpacing: '0.08em',
                textAlign: 'center',
              }}
            >
              ↗ VER EN USGS EARTHQUAKE HAZARDS
            </a>
          )}

          {/* ── news ── */}
          <NewsSection keyword={keyword} eventId={eventId} />
        </div>

        {/* footer coords */}
        <div style={{
          padding: '0.375rem 0.75rem',
          borderTop: '1px solid var(--color-slate)',
          fontFamily: 'var(--font-hud)',
          fontSize: '0.4375rem',
          color: 'var(--color-muted)',
          letterSpacing: '0.08em',
        }}>
          GeoVigil SAR · {object.lat.toFixed(5)}, {object.lng.toFixed(5)}
        </div>
      </div>
    </div>
  )
}
