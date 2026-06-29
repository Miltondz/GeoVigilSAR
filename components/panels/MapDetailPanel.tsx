'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { SelectedMapObject } from '@/lib/types/map-selection'
import type { FlightRoute, FlightAirport } from '@/lib/airports'
import { countryFlag } from '@/lib/country-flags'
import { AircraftSilhouette, categoryLabel } from '@/lib/aircraft-silhouettes'
import { addSavedEvent, isEventSaved } from '@/lib/saved-events'

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
  flightRoute?: FlightRoute | null
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

function AirportBadge({ ap, role }: { ap: FlightAirport; role: 'DEP' | 'ARR' }) {
  const color = role === 'DEP' ? 'var(--color-green)' : 'var(--color-amber)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.375rem', border: `1px solid ${color}` }}>
      <span style={{ fontSize: '1rem', lineHeight: 1 }}>{countryFlag(ap.country)}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color, fontWeight: 700 }}>
          {ap.iata ?? ap.icao}
          <span style={{ fontWeight: 400, marginLeft: 4, fontSize: '0.4375rem', color: 'var(--color-muted)', letterSpacing: '0.1em' }}>{role}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)' }}>
          {ap.city}
        </div>
      </div>
    </div>
  )
}

export default function MapDetailPanel({ object, onClose, eventId, flightRoute }: MapDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [saved, setSaved] = useState(false)
  const [pos, setPos] = useState({ x: 20, y: 60 })
  const drag = useRef({ on: false, ox: 0, oy: 0, px: 0, py: 0 })

  // Position to top-right on mount
  useEffect(() => {
    setPos({ x: Math.max(0, window.innerWidth - 360), y: 60 })
  }, [])

  useEffect(() => {
    if (!object) { setSaved(false); return }
    const id = object.type === 'earthquake' ? object.id : null
    if (id) setSaved(isEventSaved(id))
    else setSaved(false)
  }, [object])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    if (!object || object.type !== 'earthquake') return
    addSavedEvent({
      id:        object.id,
      label:     `M${object.magnitude.toFixed(1)} — ${object.place}`,
      place:     object.place,
      lat:       object.lat,
      lng:       object.lng,
      magnitude: object.magnitude,
      depth:     object.depth,
      time:      object.time,
      eventId,
    })
    setSaved(true)
  }

  const onPtrDown = useCallback((e: React.PointerEvent) => {
    drag.current = { on: true, ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [pos])

  const onPtrMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.on) return
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 340, drag.current.px + e.clientX - drag.current.ox)),
      y: Math.max(0, Math.min(window.innerHeight - 100, drag.current.py + e.clientY - drag.current.oy)),
    })
  }, [])

  const onPtrUp = useCallback(() => { drag.current.on = false }, [])

  if (!object) return null

  const isEq       = object.type === 'earthquake'
  const isDmg      = object.type === 'damage'
  const isSat      = object.type === 'satellite'
  const isAircraft = object.type === 'aircraft'
  const isAirport  = object.type === 'airport'
  const isWeather  = object.type === 'weather'
  const isBuoy     = object.type === 'buoy'
  const isOsm      = object.type === 'osm'
  const isAdmin    = object.type === 'admin'
  const isUsaid    = object.type === 'usaid'
  const isFunding  = object.type === 'funding'

  const keyword   = isEq ? placeKeyword(object.place) : isDmg ? object.address.split('—')[0].trim() : ''

  const typeColor = isEq
    ? (object.magnitude >= 6.5 ? 'var(--color-red)' : 'var(--color-amber)')
    : isDmg
    ? (object.damageType === 'collapsed' ? 'var(--color-red)' : 'var(--color-amber)')
    : isAircraft
    ? (object.onGround ? 'var(--color-muted)' : 'var(--color-cyan)')
    : isUsaid
    ? (object.status === 'Active' ? 'var(--color-green)' : 'var(--color-muted)')
    : isFunding ? 'var(--color-amber)'
    : 'var(--color-cyan)'

  const typeBadge = isEq
    ? `M ${object.magnitude.toFixed(1)} SISMO`
    : isDmg
    ? (object.damageType === 'collapsed' ? 'COLAPSO ESTRUCTURAL' : object.damageType === 'damaged' ? 'DAÑO ESTRUCTURAL' : 'ZONA AFECTADA')
    : isSat ? `${object.orbitClass} · NORAD ${object.noradId}`
    : isAircraft ? (object.onGround ? 'EN TIERRA' : 'EN VUELO')
    : isAirport ? 'AEROPUERTO'
    : isWeather ? 'ESTACIÓN CLIMA'
    : isBuoy ? 'BOYA NOAA'
    : isOsm ? object.kind.toUpperCase().replace('_', ' ')
    : isAdmin ? 'LÍMITE ADMINISTRATIVO'
    : isUsaid ? `USAID · ${object.disasterType}`
    : isFunding ? 'FLUJO FINANCIAMIENTO ONU'
    : ''

  const title = isEq ? object.place
    : isDmg ? object.address
    : isSat ? object.name
    : isAircraft ? `${object.callsign} — ${object.originCountry}`
    : isAirport ? `${object.name} (${object.iata})`
    : isWeather ? `${object.lat.toFixed(2)}°N ${Math.abs(object.lng).toFixed(2)}°W`
    : isBuoy ? `Boya ${object.id}`
    : isOsm ? object.name
    : isAdmin ? object.name
    : isUsaid ? `${object.country} — ${object.disasterType}`
    : isFunding ? object.organization
    : ''

  return (
    /* floating draggable modal */
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 340,
        maxHeight: 'calc(100vh - 80px)',
        backgroundColor: 'rgba(0,26,36,0.97)',
        border: `1px solid ${typeColor}`,
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(6px)',
        zIndex: 200,
        boxShadow: `0 4px 32px rgba(0,0,0,0.6), 0 0 0 1px ${typeColor}22`,
        userSelect: 'none',
      }}
    >
      {/* drag handle = header */}
      <div
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        style={{
          padding: '0.625rem 0.75rem',
          borderBottom: '1px solid var(--color-slate)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
          cursor: 'move',
        }}
      >
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'flex-end', flexShrink: 0 }}>
            {/* Save / bookmark — only for earthquakes */}
            {object.type === 'earthquake' && (
              <button
                onClick={handleSave}
                disabled={saved}
                title={saved ? 'Ya guardado en eventos' : 'Guardar este sismo'}
                style={{
                  background: 'none',
                  border: `1px solid ${saved ? 'var(--color-green)' : 'var(--color-slate)'}`,
                  color: saved ? 'var(--color-green)' : 'var(--color-muted)',
                  cursor: saved ? 'default' : 'pointer',
                  fontFamily: 'var(--font-hud)',
                  fontSize: '0.625rem',
                  padding: '0.125rem 0.375rem',
                  lineHeight: 1,
                  letterSpacing: '0.08em',
                  transition: 'all 0.15s',
                }}
              >
                {saved ? '◈ GUARDADO' : '◈ GUARDAR'}
              </button>
            )}
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

          {/* ── satellite metadata ── */}
          {isSat && (() => {
            const sat = object  // type is 'satellite'
            const win = sat.nextCaptureWindow
            const msUntil = win ? win.startMs - Date.now() : null
            const hoursUntil = msUntil != null ? Math.max(0, msUntil / 3_600_000) : null
            const durationMin = win ? Math.round((win.endMs - win.startMs) / 60_000) : null
            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  <MetaCell label="ALTITUD"      value={`${Math.round(sat.altitudeKm)} km`}     accent="var(--color-cyan)" />
                  <MetaCell label="ÓRBITA"        value={sat.orbitClass}                         accent="var(--color-cyan)" />
                  <MetaCell label="LATITUD"       value={`${sat.lat.toFixed(3)}°`} />
                  <MetaCell label="LONGITUD"      value={`${sat.lng.toFixed(3)}°`} />
                </div>

                <div style={{ borderTop: '1px solid var(--color-slate)', paddingTop: '0.625rem' }}>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
                    VENTANA DE CAPTURA SAR
                  </div>
                  {win && hoursUntil != null ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <MetaCell
                        label="PRÓXIMO PASO"
                        value={hoursUntil < 1 ? `${Math.round(hoursUntil * 60)} min` : `${hoursUntil.toFixed(1)} h`}
                        accent={hoursUntil < 2 ? 'var(--color-green)' : 'var(--color-cyan)'}
                      />
                      <MetaCell label="DURACIÓN"     value={`${durationMin} min`} />
                      <MetaCell label="ELEV. MÁX."   value={`${win.maxElevationDeg.toFixed(1)}°`} />
                      <MetaCell label="HORA INICIO"  value={new Date(win.startMs).toISOString().slice(11, 16) + ' UTC'} />
                    </div>
                  ) : (
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>
                      Sin paso en próximas 24h
                    </div>
                  )}
                </div>

                <a
                  href={`https://www.n2yo.com/satellite/?s=${sat.noradId}`}
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
                  ↗ VER EN N2YO TRACKING
                </a>
              </>
            )
          })()}

          {/* ── aircraft metadata ── */}
          {isAircraft && (() => {
            const ac = object
            const altM    = ac.baroAltitude
            const altFt   = altM != null ? Math.round(altM * 3.28084) : null
            const spdKmh  = ac.velocity != null ? Math.round(ac.velocity * 3.6) : null
            const vrSign  = ac.verticalRate != null ? (ac.verticalRate > 0 ? '▲' : ac.verticalRate < 0 ? '▼' : '►') : '—'
            const vrMs    = ac.verticalRate != null ? `${vrSign} ${Math.abs(ac.verticalRate).toFixed(1)} m/s` : '—'
            const hdg     = ac.heading != null ? `${Math.round(ac.heading)}°` : '—'
            const ago     = Math.round((Date.now() / 1000 - ac.lastContact))
            return (
              <>
                {/* ── Silhouette + type row ────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.375rem 0', borderTop: '1px solid var(--color-slate)', borderBottom: '1px solid var(--color-slate)' }}>
                  <div style={{ flexShrink: 0 }}>
                    <AircraftSilhouette category={ac.category} size={52} color="var(--color-cyan)" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>TIPO AERONAVE</div>
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-text)', fontWeight: 600 }}>
                      {flightRoute?.model ?? categoryLabel(ac.category)}
                    </div>
                    {flightRoute?.aircraftType && (
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-cyan)', marginTop: 2, letterSpacing: '0.12em' }}>
                        ICAO: {flightRoute.aircraftType}
                        {flightRoute.registration && ` · REG: ${flightRoute.registration}`}
                      </div>
                    )}
                    {flightRoute?.operator && (
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', marginTop: 2 }}>
                        {flightRoute.operator}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Origin/destination flag row ───────────────────── */}
                <div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.375rem' }}>
                    RUTA DE VUELO
                  </div>
                  {(flightRoute?.departure || flightRoute?.arrival) ? (
                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'stretch' }}>
                      {flightRoute?.departure && <AirportBadge ap={flightRoute.departure} role="DEP" />}
                      {flightRoute?.departure && flightRoute?.arrival && (
                        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--color-muted)', alignSelf: 'center', padding: '0 0.125rem' }}>→</div>
                      )}
                      {flightRoute?.arrival && <AirportBadge ap={flightRoute.arrival} role="ARR" />}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.125rem' }}>{countryFlag(ac.originCountry)}</span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-text)' }}>{ac.originCountry}</div>
                        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)' }}>País de matrícula</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Flight data grid ─────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  <MetaCell label="ICAO24"      value={ac.icao24.toUpperCase()} accent="var(--color-muted)" />
                  <MetaCell label="CALLSIGN"    value={ac.callsign ?? '—'}     accent="var(--color-cyan)" />
                  <MetaCell
                    label="ALTITUD"
                    value={altM != null ? `${Math.round(altM)} m · ${altFt?.toLocaleString()} ft` : '—'}
                    accent={typeColor}
                  />
                  <MetaCell label="VELOCIDAD"   value={spdKmh != null ? `${spdKmh} km/h` : '—'} />
                  <MetaCell label="TASA VERT."  value={vrMs} />
                  <MetaCell label="RUMBO"       value={hdg} />
                  <MetaCell label="ÚLIMO CONT." value={`hace ${ago}s`} accent={ago > 120 ? 'var(--color-amber)' : undefined} />
                </div>

                <a
                  href={`https://www.flightradar24.com/data/airplanes/${ac.icao24}`}
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
                  ↗ VER EN FLIGHTRADAR24
                </a>
              </>
            )
          })()}

          {/* ── airport metadata ── */}
          {isAirport && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <MetaCell label="IATA"  value={object.iata}  accent="var(--color-cyan)" />
              <MetaCell label="ICAO"  value={object.icao}  accent="var(--color-cyan)" />
              <MetaCell label="PAÍS"  value={object.country} />
              <MetaCell label="COORD" value={`${object.lat.toFixed(3)}°, ${object.lng.toFixed(3)}°`} />
            </div>
          )}

          {/* ── weather metadata ── */}
          {isWeather && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <MetaCell label="TEMPERATURA"   value={`${object.temp}°C`}          accent="var(--color-amber)" />
              <MetaCell label="VIENTO"        value={`${object.windSpeed} km/h`}  accent="var(--color-cyan)" />
              <MetaCell label="DIRECCIÓN"     value={`${object.windDir}°`} />
              <MetaCell label="RÁFAGAS"       value={`${object.windGusts} km/h`}  accent={object.windGusts > 60 ? 'var(--color-red)' : undefined} />
              <MetaCell label="PRECIPITACIÓN" value={`${object.precip} mm`}       accent={object.precip > 1 ? 'var(--color-amber)' : undefined} />
              <MetaCell label="NUBES"         value={`${object.cloudCover}%`} />
            </div>
          )}

          {/* ── buoy metadata ── */}
          {isBuoy && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <MetaCell label="OLA (m)"        value={object.waveHeight != null ? `${object.waveHeight} m` : '—'} accent="var(--color-cyan)" />
              <MetaCell label="T° MAR"         value={object.seaTemp != null ? `${object.seaTemp}°C` : '—'} />
              <MetaCell label="T° AIRE"        value={object.airTemp  != null ? `${object.airTemp}°C` : '—'} />
              <MetaCell label="PRESIÓN"        value={object.pressure != null ? `${object.pressure} hPa` : '—'} />
              <MetaCell label="VIENTO (m/s)"   value={object.windSpeed != null ? `${object.windSpeed} m/s` : '—'} />
            </div>
          )}

          {/* ── OSM infra metadata ── */}
          {isOsm && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <MetaCell label="TIPO"  value={object.kind.replace('_', ' ').toUpperCase()} accent="var(--color-green)" />
              <MetaCell label="ID OSM" value={String(object.id)} accent="var(--color-muted)" />
            </div>
          )}

          {/* ── admin boundary metadata ── */}
          {isAdmin && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <MetaCell label="PCODE"      value={object.pcode} accent="var(--color-muted)" />
              <MetaCell label="POBLACIÓN"  value={object.population > 0 ? object.population.toLocaleString() : '—'} accent="var(--color-cyan)" />
            </div>
          )}

          {/* ── USAID declaration metadata ── */}
          {isUsaid && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <MetaCell label="PAÍS"        value={object.country} accent="var(--color-text)" />
              <MetaCell label="TIPO"        value={object.disasterType} />
              <MetaCell label="FECHA"       value={object.declarationDate.slice(0, 10)} />
              <MetaCell label="ESTADO"      value={object.status} accent={object.status === 'Active' ? 'var(--color-green)' : 'var(--color-muted)'} />
              {object.fundingUsd != null && (
                <MetaCell label="FINANCIAMIENTO" value={`$${(object.fundingUsd / 1e6).toFixed(1)}M USD`} accent="var(--color-amber)" />
              )}
            </div>
          )}

          {/* ── funding flow metadata ── */}
          {isFunding && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <MetaCell label="ORGANIZACIÓN" value={object.organization} accent="var(--color-amber)" />
              <MetaCell label="TOTAL USD"    value={`$${(object.totalUsd / 1e6).toFixed(2)}M`} accent="var(--color-green)" />
            </div>
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

          {/* ── news (not shown for aircraft/satellite — no place context) ── */}
          {(isEq || isDmg) && <NewsSection keyword={keyword} eventId={eventId} />}
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
  )
}
