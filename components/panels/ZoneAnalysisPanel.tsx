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

// ── Image tile ────────────────────────────────────────────────────────────────

function ImageTile({ img }: { img: ZoneImage }) {
  const [err, setErr] = useState(false)
  const phaseColor = img.phase === 'before' ? 'var(--color-muted)'
                   : img.phase === 'after'  ? 'var(--color-amber)'
                   : 'var(--color-cyan)'

  if (err) return null

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <img
        src={img.url}
        alt={img.caption ?? img.source}
        onError={() => setErr(true)}
        style={{
          width:       '100%',
          height:      120,
          objectFit:   'cover',
          display:     'block',
          backgroundColor: 'var(--color-bg)',
          border:      `1px solid ${phaseColor}`,
        }}
      />
      {/* Phase label */}
      <div style={{
        position:    'absolute',
        top:          4,
        left:         4,
        fontFamily:   'var(--font-hud)',
        fontSize:     '0.4375rem',
        letterSpacing:'0.15em',
        color:         phaseColor,
        backgroundColor: 'rgba(0,10,15,0.8)',
        padding:      '0.1rem 0.3rem',
        pointerEvents: 'none',
      }}>
        {img.phase === 'before' ? 'ANTES' : img.phase === 'after' ? 'DESPUÉS' : 'CONTEXTO'}
      </div>
      {/* Source */}
      <div style={{
        position:    'absolute',
        bottom:       4,
        right:        4,
        fontFamily:   'var(--font-hud)',
        fontSize:     '0.375rem',
        color:        'var(--color-muted)',
        backgroundColor: 'rgba(0,10,15,0.8)',
        padding:      '0.1rem 0.25rem',
        pointerEvents: 'none',
      }}>
        {img.source === 'nasa-gibs' ? 'NASA GIBS'
        : img.source === 'mapillary' ? 'MAPILLARY'
        : 'WIKIMEDIA'}
      </div>
      {/* Caption tooltip (truncated) */}
      {img.caption && (
        <div style={{
          position:   'absolute',
          bottom:     0,
          left:       0,
          right:      0,
          fontFamily: 'var(--font-hud)',
          fontSize:   '0.375rem',
          color:      'var(--color-text)',
          backgroundColor: 'rgba(0,10,15,0.7)',
          padding:    '0.1rem 0.3rem',
          overflow:   'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {img.capturedAt ? new Date(img.capturedAt).toISOString().slice(0, 10) + ' · ' : ''}
          {img.caption}
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ZoneAnalysisPanel({ visible, snapshot, onClose }: ZoneAnalysisPanelProps) {
  const [newsPage, setNewsPage] = useState(0)
  const NEWS_PER_PAGE = 8

  if (!visible || !snapshot) return null

  const { zone, news, reports, images, aiExtract } = snapshot

  const beforeImages  = images.filter(i => i.phase === 'before')
  const afterImages   = images.filter(i => i.phase === 'after')
  const contextImages = images.filter(i => i.phase === 'context')
  const satImages     = images.filter(i => i.source === 'nasa-gibs')
  const streetImages  = images.filter(i => i.source === 'mapillary')
  const wikiImages    = images.filter(i => i.source === 'wikimedia')

  const pagedNews    = news.slice(newsPage * NEWS_PER_PAGE, (newsPage + 1) * NEWS_PER_PAGE)
  const totalPages   = Math.ceil(news.length / NEWS_PER_PAGE)

  const ai = aiExtract

  return (
    <div style={{
      position:        'absolute',
      top:             0,
      right:           0,
      width:           460,
      height:          '100%',
      backgroundColor: 'var(--color-panel)',
      borderLeft:      '1px solid var(--color-cyan)',
      display:         'flex',
      flexDirection:   'column',
      zIndex:          70,
      boxShadow:       '-4px 0 24px rgba(0,0,0,0.5)',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding:       '0.75rem 1rem',
        borderBottom:  '1px solid var(--color-slate)',
        display:       'flex',
        alignItems:    'flex-start',
        gap:           '0.5rem',
        flexShrink:    0,
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '0.875rem', lineHeight: 1 }}
        >✕</button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>

        {/* AI Summary */}
        {ai && (ai.summary || ai.keyFacts.length > 0) && (
          <div style={{ marginBottom: '1rem' }}>
            <SectionLabel>◈ ANÁLISIS IA · {ai.confidence.toUpperCase()} CONFIANZA</SectionLabel>

            {ai.summary && (
              <div style={{
                fontFamily:      'var(--font-hud)',
                fontSize:        '0.6875rem',
                color:           'var(--color-text)',
                lineHeight:       1.6,
                marginBottom:    '0.625rem',
                paddingLeft:     '0.5rem',
                borderLeft:      '2px solid var(--color-cyan)',
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
                  fontFamily:    'var(--font-hud)',
                  fontSize:      '0.625rem',
                  color:         'var(--color-text)',
                  border:        '1px solid var(--color-slate)',
                  padding:       '0.125rem 0.4rem',
                  backgroundColor: 'rgba(26,58,74,0.3)',
                }}>
                  {loc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Satellite before/after */}
        {satImages.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <SectionLabel>🛰 SATÉLITE NASA GIBS · ANTES / DESPUÉS</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {satImages.slice(0, 6).map(img => (
                <ImageTile key={img.id} img={img} />
              ))}
            </div>
          </div>
        )}

        {/* Street level images */}
        {streetImages.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <SectionLabel>⊙ NIVEL DE CALLE (MAPILLARY) · {beforeImages.filter(i => i.source === 'mapillary').length} ANTES · {afterImages.filter(i => i.source === 'mapillary').length} DESPUÉS</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {streetImages.slice(0, 6).map(img => (
                <ImageTile key={img.id} img={img} />
              ))}
            </div>
          </div>
        )}

        {/* Wikimedia context images */}
        {contextImages.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <SectionLabel>◫ IMÁGENES DE CONTEXTO (WIKIMEDIA)</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {contextImages.slice(0, 4).map(img => (
                <ImageTile key={img.id} img={img} />
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
                <button
                  onClick={() => setNewsPage(p => Math.max(0, p - 1))}
                  disabled={newsPage === 0}
                  style={{ ...navBtn, opacity: newsPage === 0 ? 0.3 : 1 }}
                >◀</button>
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', padding: '0.25rem 0' }}>
                  {newsPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setNewsPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={newsPage === totalPages - 1}
                  style={{ ...navBtn, opacity: newsPage === totalPages - 1 ? 0.3 : 1 }}
                >▶</button>
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

        {news.length === 0 && reports.length === 0 && (
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.75rem', color: 'var(--color-muted)', padding: '2rem 0', textAlign: 'center' }}>
            Sin datos disponibles para esta zona.
          </div>
        )}
      </div>

      {/* Footer: source counts */}
      <div style={{
        padding:       '0.375rem 1rem',
        borderTop:     '1px solid var(--color-slate)',
        fontFamily:    'var(--font-hud)',
        fontSize:      '0.4375rem',
        color:         'var(--color-muted)',
        display:       'flex',
        gap:           '0.75rem',
        flexWrap:      'wrap',
        flexShrink:    0,
      }}>
        <span>GDELT · {news.filter(n => !['BBC News','Al Jazeera','EMSC','ReliefWeb'].includes(n.source)).length}</span>
        <span>BBC+AJE+EMSC · {news.filter(n => ['BBC News','Al Jazeera','EMSC'].includes(n.source)).length}</span>
        <span>ReliefWeb · {reports.length}</span>
        <span>Mapillary · {streetImages.length}</span>
        <span>Wikimedia · {wikiImages.length}</span>
        <span>NASA GIBS · {satImages.length}</span>
      </div>
    </div>
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
