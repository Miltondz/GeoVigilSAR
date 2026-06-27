'use client'

import { useState, useEffect } from 'react'

interface SituationReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  locale: string
}

export default function SituationReportModal({
  isOpen,
  onClose,
  eventId,
  locale,
}: SituationReportModalProps) {
  const [includeAI, setIncludeAI] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [markdown, setMarkdown] = useState('')
  const [copied, setCopied] = useState(false)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setMarkdown('')
      setCopied(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const isES = locale === 'es'

  const labels = {
    title:      isES ? 'REPORTE DE SITUACIÓN' : 'SITUATION REPORT',
    includeAI:  isES ? 'Incluir análisis IA' : 'Include AI analysis',
    generate:   isES ? 'GENERAR REPORTE' : 'GENERATE REPORT',
    generating: isES ? 'Generando...' : 'Generating...',
    download:   isES ? 'DESCARGAR .MD' : 'DOWNLOAD .MD',
    copy:       isES ? 'COPIAR' : 'COPY',
    copied:     isES ? 'COPIADO' : 'COPIED',
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setMarkdown('')
    try {
      const res = await fetch('/api/situation-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, locale, includeAI }),
      })
      if (res.ok) {
        const data = (await res.json()) as { markdown: string; generatedAt: number }
        setMarkdown(data.markdown)
      }
    } catch {
      // network error — keep empty markdown
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sitrep-${eventId}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  const btnBase: React.CSSProperties = {
    fontFamily: 'var(--font-hud)',
    fontSize: '0.5625rem',
    letterSpacing: '0.12em',
    border: '1px solid var(--color-slate)',
    padding: '0.375rem 0.75rem',
    cursor: 'pointer',
    background: 'none',
    textTransform: 'uppercase' as const,
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,10,15,0.85)',
          zIndex: 500,
        }}
      />

      {/* Modal box */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          maxWidth: '95vw',
          maxHeight: '80vh',
          backgroundColor: 'var(--color-panel)',
          border: '1px solid var(--color-slate)',
          zIndex: 501,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.625rem 1rem',
            borderBottom: '1px solid var(--color-slate)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-headline)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-cyan)',
              letterSpacing: '0.2em',
            }}
          >
            {labels.title}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.5rem',
              color: 'var(--color-muted)',
            }}
          >
            {eventId}
          </span>
          <button
            onClick={onClose}
            style={{
              ...btnBase,
              color: 'var(--color-muted)',
              border: 'none',
              fontSize: '0.75rem',
              padding: '0 0.25rem',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Options row */}
        {!markdown && (
          <div
            style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              borderBottom: '1px solid var(--color-slate)',
              flexShrink: 0,
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-hud)',
                fontSize: '0.5625rem',
                color: 'var(--color-text)',
                letterSpacing: '0.08em',
              }}
            >
              <input
                type="checkbox"
                checked={includeAI}
                onChange={e => setIncludeAI(e.target.checked)}
                style={{ accentColor: 'var(--color-green)', cursor: 'pointer' }}
              />
              {labels.includeAI}
            </label>

            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                ...btnBase,
                color: generating ? 'var(--color-muted)' : 'var(--color-green)',
                borderColor: generating ? 'var(--color-slate)' : 'var(--color-green)',
                opacity: generating ? 0.7 : 1,
              }}
            >
              {generating ? labels.generating : labels.generate}
            </button>

            {generating && (
              <span
                style={{
                  fontFamily: 'var(--font-hud)',
                  fontSize: '0.5rem',
                  color: 'var(--color-cyan)',
                  animation: 'pulse 1s infinite',
                }}
              >
                ●
              </span>
            )}
          </div>
        )}

        {/* Markdown output */}
        {markdown && (
          <>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                minHeight: 0,
              }}
            >
              <pre
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {markdown}
              </pre>
            </div>

            {/* Action bar */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--color-slate)',
                flexShrink: 0,
              }}
            >
              <button
                onClick={handleDownload}
                style={{ ...btnBase, color: 'var(--color-cyan)', borderColor: 'var(--color-cyan)' }}
              >
                ↓ {labels.download}
              </button>
              <button
                onClick={handleCopy}
                style={{
                  ...btnBase,
                  color: copied ? 'var(--color-green)' : 'var(--color-text)',
                  borderColor: copied ? 'var(--color-green)' : 'var(--color-slate)',
                }}
              >
                {copied ? labels.copied : labels.copy}
              </button>
              <button
                onClick={() => setMarkdown('')}
                style={{ ...btnBase, color: 'var(--color-muted)', marginLeft: 'auto' }}
              >
                ← NUEVO
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
