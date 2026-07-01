'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'

interface SearchResult {
  lat: number
  lng: number
  name: string
  type: string
  bbox?: [number, number, number, number]
}

interface ZoneSearchProps {
  onResult: (result: { lat: number; lng: number; name: string; bbox?: [number, number, number, number] }) => void
  placeholder?: string
}

export default function ZoneSearch({ onResult, placeholder = 'BUSCAR ZONA...' }: ZoneSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.length < 3) {
      setResults([])
      setOpen(false)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      setLoading(true)
      fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        .then(r => (r.ok ? r.json() : { results: [] }))
        .then((data: { results: SearchResult[] }) => {
          setResults(data.results)
          setOpen(data.results.length > 0)
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 400)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const handleSelect = (r: SearchResult) => {
    onResult({ lat: r.lat, lng: r.lng, name: r.name, bbox: r.bbox })
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setResults([])
    }
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid var(--color-slate)',
          backgroundColor: 'var(--color-panel)',
          padding: '0 0.5rem',
          gap: '0.375rem',
          height: 26,
        }}
      >
        {/* Search icon */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <circle cx="4" cy="4" r="3" stroke="var(--color-muted)" strokeWidth="1.2" fill="none" />
          <line x1="6.5" y1="6.5" x2="9" y2="9" stroke="var(--color-muted)" strokeWidth="1.2" />
        </svg>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          style={{
            background: 'none',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-hud)',
            fontSize: '0.5625rem',
            color: 'var(--color-text)',
            letterSpacing: '0.1em',
            width: 140,
            padding: 0,
          }}
        />

        {loading && (
          <span
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.5rem',
              color: 'var(--color-muted)',
            }}
          >
            ···
          </span>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            minWidth: 220,
            backgroundColor: 'var(--color-panel)',
            border: '1px solid var(--color-slate)',
            borderTop: 'none',
            zIndex: 300,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.375rem 0.5rem',
                background: 'none',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid var(--color-slate)' : 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-hud)',
                fontSize: '0.5rem',
                color: 'var(--color-text)',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ color: 'var(--color-cyan)' }}>{r.type.toUpperCase()}</span>
              {' '}
              {r.name.split(',')[0]}
              <span
                style={{
                  display: 'block',
                  color: 'var(--color-muted)',
                  fontSize: '0.4375rem',
                  marginTop: 1,
                }}
              >
                {r.lat.toFixed(4)},{r.lng.toFixed(4)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
