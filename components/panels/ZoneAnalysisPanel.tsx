'use client'

import { useState } from 'react'
import type { ZoneSnapshot } from '@/lib/zone-cache'
import type { ZoneImage } from '@/lib/imagery'

interface ZoneAnalysisPanelProps {
  visible:  boolean
  snapshot: ZoneSnapshot | null
  onClose:  () => void
}

const riskColor: Record<string, string> = {
  critical: 'var(--color-red)',
  high:     'var(--color-amber)',
  moderate: 'var(--color-cyan)',
  low:      'var(--color-green)',
  unknown:  'var(--color-muted)',
}

function RiskBadge({ level }: { level: string }) {
  const color = riskColor[level] ?? 'var(--color-muted)'
  return (
    <span style={{
      fontFamily:    'var(--font-hud)',
      fontSize:      '0.5rem',
      letterSpacing: '0.2em',
      color,
      border:        `1px solid ${color}`,
      padding:       '0.125rem 0.375rem',
      lineHeight:    1,
    }}>
      {level.toUpperCase()}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily:    'var(--font-hud)',
      fontSize:      '0.5rem',
      color:         'var(--color-muted)',
      letterSpacing: '0.2em',
      marginBottom:  '0.5rem',
      paddingBottom: '0.25rem',
      borderBottom:  '1px solid rgba(26,58,74,0.5)',
    }}>
      {children}
    </div>
  )
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ img, onClose }: { img: ZoneImage; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setScale(s => s === 1 ? 2.5 : 1)
  }
  return (
    <div
      onClick={onClose}
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          400,
        backgroundColor: 'rgba(0,0,0,0.95)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        cursor:          'zoom-out',
      }}
    >
      <img
        src={img.url}
        alt={img.caption ?? img.source}
        onClick={toggle}
        style={{
          maxWidth:    '92vw',
          maxHeight:   '85vh',
          objectFit:   'contain',
          transform:   `scale(${scale})`,
          transition:  'transform 0.25s ease',
          cursor:      scale === 1 ? 'zoom-in' : 'zoom-out',
        }}
      />
      <div style={{
        position:    'absolute',
        bottom:      16,
        left:        0,
        right:       0,
        textAlign:   'center',
        fontFamily:  'var(--font-hud)',
        fontSize:    '0.5rem',
        color:       'rgba(255,255,255,0.5)',
        letterSpacing: '0.1em',
        pointerEvents: 'none',
      }}>
        {img.caption} {img.capturedAt ? `· ${new Date(img.capturedAt).toISOString().slice(0,10)}` : ''}
        {' · '}<span style={{ color: 'rgba(255,255,255,0.3)' }}>toca imagen para zoom · toca fondo para cerrar</span>
      </div>
      <button
        onClick={onClose}
        style={{
          position:        'absolute',
          top:             16,
          right:           16,
          background:      'none',
          border:          '1px solid rgba(255,255,255,0.3)',
          color:           'white',
          fontSize:        '0.875rem',
          cursor:          'pointer',
          padding:         '0.375rem 0.625rem',
          fontFamily:      'var(--font-hud)',
          lineHeight:      1,
        }}
      >✕</button>
    </div>
  )
}

// ── Image tile ────────────────────────────────────────────────────────────────

function ImageTile({ img, onOpen }: { img: ZoneImage; onOpen: (img: ZoneImage) => void }) {
  const [err, setErr] = useState(false)
  const phaseColor = img.phase === 'before' ? 'var(--color-muted)'
                   : img.phase === 'after'  ? 'var(--color-amber)'
                   : 'var(--color-cyan)'

  if (err) return null

  return (
    <div
      onClick={() => onOpen(img)}
      style={{ position: 'relative', flexShrink: 0, cursor: 'zoom-in' }}
    >
      <img
        src={img.url}
        alt={img.caption ?? img.source}
        onError={() => setErr(true)}
        style={{
          width:           '100%',
          height:          120,
          objectFit:       'cover',
          display:         'block',
          backgroundColor: 'var(--color-bg)',
          border:          `1px solid ${phaseColor}`,
        }}
      />
      <div style={{
        position:        'absolute',
        top:              4,
        left:             4,
        fontFamily:       'var(--font-hud)',
        fontSize:         '0.4375rem',
        letterSpacing:    '0.15em',
        color:             phaseColor,
        backgroundColor:  'rgba(0,10,15,0.8)',
        padding:          '0.1rem 0.3rem',
        pointerEvents:    'none',
      }}>
        {img.phase === 'before' ? 'ANTES' : img.phase === 'after' ? 'DESPUÉS' : 'CONTEXTO'}
      </div>
      <div style={{
        position:        'absolute',
        bottom:           4,
        right:            4,
        fontFamily:       'var(--font-hud)',
        fontSize:         '0.375rem',
        color:            'var(--color-muted)',
        backgroundColor:  'rgba(0,10,15,0.8)',
        padding:          '0.1rem 0.25rem',
        pointerEvents:    'none',
      }}>
        {img.source === 'sentinel2' ? 'SENTINEL-2'
        : img.source === 'esri' ? 'ESRI'
        : img.source === 'mapillary' ? 'MAPILLARY'
        : 'WIKIMEDIA'}
      </div>
      {img.caption && (
        <div style={{
          position:        'absolute',
          bottom:          0,
          left:            0,
          right:           0,
          fontFamily:      'var(--font-hud)',
          fontSize:        '0.375rem',
          color:           'var(--color-text)',
          backgroundColor: 'rgba(0,10,15,0.7)',
          padding:         '0.1rem 0.3rem',
          overflow:        'hidden',
          whiteSpace:      'nowrap',
          textOverflow:    'ellipsis',
          pointerEvents:   'none',
        }}>
          {img.capturedAt ? new Date(img.capturedAt).toISOString().slice(0, 10) + ' · ' : ''}
          {img.caption}
        </div>
      )}
      {/* zoom hint */}
      <div style={{
        position:        'absolute',
        top:              4,
        right:            4,
        fontFamily:       'var(--font-hud)',
        fontSize:         '0.4375rem',
        color:            'rgba(255,255,255,0.4)',
        backgroundColor:  'rgba(0,0,0,0.5)',
        padding:          '0.1rem 0.2rem',
        pointerEvents:    'none',
      }}>⊕</div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ZoneAnalysisPanel({ visible, snapshot, onClose }: ZoneAnalysisPanelProps) {
  const [newsPage,    setNewsPage]    = useState(0)
  const [lightboxImg, setLightboxImg] = useState<ZoneImage | null>(null)
  const NEWS_PER_PAGE = 8

  if (!visible || !snapshot) return null

  const { zone, news, reports, images, aiExtract } = snapshot

  const satImages     = images.filter(i => i.source === 'sentinel2')
  const streetImages  = images.filter(i => i.source === 'mapillary')
  const esriImages    = images.filter(i => i.source === 'esri')
  const contextImages = images.filter(i => i.source === 'wikimedia')
  const wikiImages    = images.filter(i => i.source === 'wikimedia')
  const beforeImages  = images.filter(i => i.phase === 'before')
  const afterImages   = images.filter(i => i.phase === 'after')

  const pagedNews  = news.slice(newsPage * NEWS_PER_PAGE, (newsPage + 1) * NEWS_PER_PAGE)
  const totalPages = Math.ceil(news.length / NEWS_PER_PAGE)
  const ai         = aiExtract

  return (
    <>
      {/* Lightbox — rendered above modal */}
      {lightboxImg && (
        <Lightbox img={lightboxImg} onClose={() => setLightboxImg(null)} />
      )}

      {/* Modal backdrop */}
      <div
        onClick={onClose}
        style={{
          position:        'fixed',
          inset:           0,
          backgroundColor: 'rgba(0,8,14,0.8)',
          backdropFilter:  'blur(4px)',
          zIndex:          200,
          display:         'flex',
          alignItems:      'flex-start',
          justifyContent:  'center',
          overflowY:       'auto',
          padding:         '1rem',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        }}
      >
        {/* Modal card — stop propagation so clicks inside don't close */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width:           '100%',
            maxWidth:        640,
            backgroundColor: 'var(--color-panel)',
            border:          '1px solid var(--color-cyan)',
            display:         'flex',
            flexDirection:   'column',
            boxShadow:       '0 8px 48px rgba(0,0,0,0.7)',
            flexShrink:      0,
          }}
        >

          {/* ── Header ── */}
          <div style={{
            padding:      '0.75rem 1rem',
            borderBottom: '1px solid var(--color-slate)',
            display:      'flex',
            alignItems:   'flex-start',
            gap:          '0.5rem',
            position:     'sticky',
            top:           0,
            backgroundColor: 'var(--color-panel)',
            zIndex:        10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>
                ANÁLISIS DE ZONA · {zone.countryIso2}
              </div>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1rem', color: 'var(--color-cyan)', fontWeight: 700 }}>
                {zone.country}
              </div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.75rem' }}>
                <span>{zone.lat.toFixed(2)}° · {zone.lng.toFixed(2)}°</span>
                <span>Actualizado hace {Math.floor((Date.now() - snapshot.fetchedAt) / 60000)}min</span>
              </div>
            </div>
            {ai && <RiskBadge level={ai.riskLevel} />}
            <button
              onClick={onClose}
              style={{
                background:  'none',
                border:      '1px solid var(--color-slate)',
                cursor:      'pointer',
                color:       'var(--color-muted)',
                fontSize:    '0.875rem',
                lineHeight:  1,
                padding:     '0.375rem 0.5rem',
                flexShrink:  0,
              }}
            >✕</button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: '0.75rem 1rem' }}>

            {/* AI Summary */}
            {ai && (ai.summary || ai.keyFacts.length > 0) && (
              <div style={{ marginBottom: '1rem' }}>
                <SectionLabel>◈ ANÁLISIS IA · {ai.confidence.toUpperCase()} CONFIANZA</SectionLabel>
                {ai.summary && (
                  <div style={{
                    fontFamily:   'var(--font-hud)',
                    fontSize:     '0.6875rem',
                    color:        'var(--color-text)',
                    lineHeight:    1.6,
                    marginBottom: '0.625rem',
                    paddingLeft:  '0.5rem',
                    borderLeft:   '2px solid var(--color-cyan)',
                  }}>
                    {ai.summary}
                  </div>
                )}
                {ai.keyFacts.length > 0 && (
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {ai.keyFacts.map((f, i) => (
                      <li key={i} style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--color-cyan)', flexShrink: 0, fontFamily: 'var(--font-hud)', fontSize: '0.625rem' }}>›</span>
                        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-text)', lineHeight: 1.5 }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Casualties */}
            {ai && Object.keys(ai.casualties).length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <SectionLabel>⚕ CIFRAS REPORTADAS</SectionLabel>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {ai.casualties.dead != null && (
                    <div>
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: 'var(--color-red)', fontWeight: 700 }}>{ai.casualties.dead}†</div>
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>FALLECIDOS</div>
                    </div>
                  )}
                  {ai.casualties.injured != null && (
                    <div>
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: 'var(--color-amber)', fontWeight: 700 }}>{ai.casualties.injured.toLocaleString()}</div>
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>HERIDOS</div>
                    </div>
                  )}
                  {ai.casualties.displaced != null && (
                    <div>
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: 'var(--color-cyan)', fontWeight: 700 }}>{ai.casualties.displaced.toLocaleString()}</div>
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>DESPLAZADOS</div>
                    </div>
                  )}
                  {ai.casualties.missing != null && (
                    <div>
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: 'var(--color-muted)', fontWeight: 700 }}>{ai.casualties.missing}</div>
                      <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>DESAPARECIDOS</div>
                    </div>
                  )}
                </div>
                {ai.sources.length > 0 && (
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                    Fuentes: {ai.sources.join(' · ')}
                  </div>
                )}
              </div>
            )}

            {/* Localities */}
            {ai && ai.localities.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <SectionLabel>⊙ LOCALIDADES AFECTADAS</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {ai.localities.map((loc, i) => (
                    <span key={i} style={{
                      fontFamily:      'var(--font-hud)',
                      fontSize:        '0.625rem',
                      color:           'var(--color-text)',
                      border:          '1px solid var(--color-slate)',
                      padding:         '0.125rem 0.4rem',
                      backgroundColor: 'rgba(26,58,74,0.3)',
                    }}>
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Images — satellite before/after */}
            {satImages.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <SectionLabel>
                  🛰 SATÉLITE SENTINEL-2 (VISTA CERCANA) · {satImages.filter(i => i.phase === 'before').length} ANTES · {satImages.filter(i => i.phase === 'after').length} DESPUÉS
                </SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {satImages.slice(0, 8).map(img => (
                    <ImageTile key={img.id} img={img} onOpen={setLightboxImg} />
                  ))}
                </div>
              </div>
            )}

            {/* Street level images */}
            {streetImages.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <SectionLabel>
                  ⊙ NIVEL DE CALLE (MAPILLARY) · {beforeImages.filter(i => i.source === 'mapillary').length} ANTES · {afterImages.filter(i => i.source === 'mapillary').length} DESPUÉS
                </SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {streetImages.slice(0, 6).map(img => (
                    <ImageTile key={img.id} img={img} onOpen={setLightboxImg} />
                  ))}
                </div>
              </div>
            )}

            {/* ESRI close aerial — current-only, no API key, fills in where Mapillary has no coverage */}
            {esriImages.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <SectionLabel>◫ VISTA AÉREA CERCANA (ESRI) · SOLO ACTUAL</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {esriImages.map(img => (
                    <ImageTile key={img.id} img={img} onOpen={setLightboxImg} />
                  ))}
                </div>
              </div>
            )}

            {/* Context images */}
            {contextImages.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <SectionLabel>◫ IMÁGENES DE CONTEXTO (WIKIMEDIA)</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {contextImages.slice(0, 4).map(img => (
                    <ImageTile key={img.id} img={img} onOpen={setLightboxImg} />
                  ))}
                </div>
              </div>
            )}

            {/* News */}
            {news.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <SectionLabel>◈ NOTICIAS · {news.length} ARTÍCULOS</SectionLabel>
                {pagedNews.map((n, i) => (
                  <a
                    key={i}
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display:        'block',
                      textDecoration: 'none',
                      marginBottom:   '0.5rem',
                      paddingBottom:  '0.5rem',
                      borderBottom:   '1px solid rgba(26,58,74,0.4)',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-text)', lineHeight: 1.4 }}>
                      {n.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', marginTop: '0.125rem', display: 'flex', gap: '0.5rem' }}>
                      <span style={{ color: n.source === 'BBC News' ? 'var(--color-red)' : n.source === 'Al Jazeera' ? 'var(--color-amber)' : n.source === 'EMSC' ? 'var(--color-cyan)' : 'var(--color-muted)' }}>
                        {n.source}
                      </span>
                      <span>{new Date(n.publishedAt).toISOString().slice(0, 10)}</span>
                      {n.language !== 'other' && <span style={{ opacity: 0.5 }}>{n.language.toUpperCase()}</span>}
                    </div>
                  </a>
                ))}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                    <button onClick={() => setNewsPage(p => Math.max(0, p - 1))} disabled={newsPage === 0} style={{ ...navBtn, opacity: newsPage === 0 ? 0.3 : 1 }}>◀</button>
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', padding: '0.25rem 0' }}>
                      {newsPage + 1} / {totalPages}
                    </span>
                    <button onClick={() => setNewsPage(p => Math.min(totalPages - 1, p + 1))} disabled={newsPage === totalPages - 1} style={{ ...navBtn, opacity: newsPage === totalPages - 1 ? 0.3 : 1 }}>▶</button>
                  </div>
                )}
              </div>
            )}

            {/* Humanitarian reports */}
            {reports.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <SectionLabel>⊕ REPORTES HUMANITARIOS · {reports.length}</SectionLabel>
                {reports.map(r => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display:        'block',
                      textDecoration: 'none',
                      marginBottom:   '0.5rem',
                      paddingBottom:  '0.5rem',
                      borderBottom:   '1px solid rgba(26,58,74,0.4)',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6875rem', color: 'var(--color-text)', lineHeight: 1.4 }}>
                      {r.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>
                      <span style={{ color: 'var(--color-red)' }}>{r.source}</span>
                      {' · '}{r.type}{' · '}{new Date(r.publishedAt).toISOString().slice(0, 10)}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {news.length === 0 && reports.length === 0 && images.length === 0 && (
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--color-muted)', padding: '2rem 0', textAlign: 'center' }}>
                Sin datos disponibles para esta zona.
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding:    '0.375rem 1rem',
            borderTop:  '1px solid var(--color-slate)',
            fontFamily: 'var(--font-hud)',
            fontSize:   '0.4375rem',
            color:      'var(--color-muted)',
            display:    'flex',
            gap:        '0.75rem',
            flexWrap:   'wrap',
          }}>
            <span>GDELT · {news.filter(n => !['BBC News','Al Jazeera','EMSC','ReliefWeb'].includes(n.source)).length}</span>
            <span>BBC+AJE+EMSC · {news.filter(n => ['BBC News','Al Jazeera','EMSC'].includes(n.source)).length}</span>
            <span>ReliefWeb · {reports.length}</span>
            <span>Mapillary · {streetImages.length}</span>
            <span>ESRI · {esriImages.length}</span>
            <span>Wikimedia · {wikiImages.length}</span>
            <span>Sentinel-2 · {satImages.length}</span>
          </div>
        </div>
      </div>
    </>
  )
}

const navBtn: React.CSSProperties = {
  background:  'none',
  border:      '1px solid var(--color-slate)',
  color:       'var(--color-muted)',
  cursor:      'pointer',
  fontFamily:  'var(--font-hud)',
  fontSize:    '0.5rem',
  padding:     '0.125rem 0.5rem',
}
