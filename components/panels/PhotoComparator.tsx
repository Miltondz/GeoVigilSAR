'use client'

import { useEffect, useRef, useState } from 'react'

interface DamageNode {
  id: string
  address: string
  buildingType?: string
  buildingYear?: number
  damageType: 'collapsed' | 'damaged' | 'unknown'
  sarConfidence: number
  photoBefore?: string
  photoAfter?: string
  associatedNews?: { title: string; source: string }[]
}

interface PhotoComparatorProps {
  isOpen: boolean
  onClose: () => void
  node?: DamageNode
}

const damageLabel = { collapsed: 'COLAPSADO', damaged: 'DAÑADO', unknown: 'DESCONOCIDO' }
const damageColor = { collapsed: 'var(--color-red)', damaged: 'var(--color-amber)', unknown: 'var(--color-muted)' }

export default function PhotoComparator({ isOpen, onClose, node }: PhotoComparatorProps) {
  const [sliderX, setSliderX] = useState(50)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) setSliderX(50)
  }, [isOpen, node?.id])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    setSliderX(Math.max(5, Math.min(95, x)))
  }

  if (!isOpen || !node) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '80vw',
          maxWidth: 900,
          backgroundColor: 'var(--color-panel)',
          border: '1px solid var(--color-slate)',
          padding: '1rem',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '0.75rem', borderBottom: '1px solid var(--color-slate)', paddingBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.875rem', color: 'var(--color-green)', letterSpacing: '0.1em' }}>
                {node.id}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text)', marginTop: '0.25rem' }}>
                {node.address}
              </div>
              {node.buildingType && (
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>
                  {node.buildingType}{node.buildingYear ? ` · est. ${node.buildingYear}` : ''}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--color-slate)', color: 'var(--color-muted)', fontFamily: 'var(--font-hud)', fontSize: '0.625rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
              CERRAR
            </button>
          </div>

          {/* Confidence bar */}
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: damageColor[node.damageType], letterSpacing: '0.1em' }}>
              STATUS: {damageLabel[node.damageType]}
            </span>
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)' }}>
              — Sentinel-1 confidence: {Math.round(node.sarConfidence * 100)}%
            </span>
            <div style={{ flex: 1, height: 4, backgroundColor: 'var(--color-slate)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${node.sarConfidence * 100}%`, backgroundColor: damageColor[node.damageType], borderRadius: 2 }} />
            </div>
          </div>
        </div>

        {/* Image comparison slider */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseDown={() => { dragging.current = true }}
          onMouseUp={() => { dragging.current = false }}
          onMouseLeave={() => { dragging.current = false }}
          style={{
            position: 'relative',
            width: '100%',
            height: 240,
            overflow: 'hidden',
            cursor: 'col-resize',
            backgroundColor: '#000',
            userSelect: 'none',
          }}
        >
          {/* POST image (right) */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a1520' }}>
            {node.photoAfter
              ? <img src={node.photoAfter} alt="POST" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-cyan)' }}>SENTINEL-2 POST</div><div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>25 junio 2026</div></div>
            }
          </div>

          {/* PRE image (left, clipped) */}
          <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - sliderX}% 0 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#001a24' }}>
            {node.photoBefore
              ? <img src={node.photoBefore} alt="PRE" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-green)' }}>SENTINEL-2 PRE</div><div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>19 mayo 2026</div></div>
            }
          </div>

          {/* Divider line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${sliderX}%`, width: 2, backgroundColor: 'var(--color-green)', boxShadow: '0 0 8px var(--color-green)', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'var(--color-green)', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#000', fontSize: '0.5rem', fontWeight: 'bold', lineHeight: 1 }}>◄►</span>
            </div>
          </div>

          {/* Labels */}
          <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-green)', letterSpacing: '0.15em', pointerEvents: 'none' }}>PRE</div>
          <div style={{ position: 'absolute', top: 8, right: 8, fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-cyan)', letterSpacing: '0.15em', pointerEvents: 'none' }}>POST</div>
        </div>

        {/* News */}
        {node.associatedNews && node.associatedNews.length > 0 && (
          <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--color-slate)', paddingTop: '0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>
              NOTICIAS ASOCIADAS
            </div>
            {node.associatedNews.map((item, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--color-cyan)' }}>{item.source}: </span>{item.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
