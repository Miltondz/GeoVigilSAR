'use client'

import { useRef, useState, useEffect } from 'react'
import NewsStream from './NewsStream'
import type { ZoneSnapshot } from '@/lib/zone-cache'

interface Message {
  role: 'system' | 'user'
  content: string
}

interface AIPanelProps {
  eventId: string
  isConnected?: boolean
  viewportLocation?: string
  isKnownEvent?: boolean
  zoneSnapshot?: ZoneSnapshot | null
}

function buildSuggested(isKnownEvent: boolean, zoneName?: string): string[] {
  if (isKnownEvent) {
    return [
      '¿Qué zonas tienen mayor riesgo de réplica?',
      '¿Qué reportan medios sobre La Guaira?',
      '¿Cuántos rescatados en Caracas?',
    ]
  }
  const place = zoneName ?? 'esta zona'
  return [
    `¿Qué sismos recientes hay en ${place}?`,
    `¿Qué reportan medios sobre ${place}?`,
    `¿Hay alertas humanitarias activas en ${place}?`,
  ]
}

function buildWelcome(eventId: string, isKnownEvent: boolean, zoneName?: string) {
  return isKnownEvent
    ? `Sistema listo. Evento ${eventId} cargado.\nFuentes activas: USGS · GDELT · ReliefWeb · Copernicus EMS.`
    : `Sistema listo. Zona en vista: ${zoneName ?? 'sin analizar'}.\nFuentes activas: USGS · GDELT · ReliefWeb · Copernicus EMS.`
}

function formatRelativeTime(publishedAt: number, now: number): string {
  const diffMin = Math.round((now - publishedAt) / 60000)
  if (diffMin < 60)   return `hace ${diffMin}m`
  if (diffMin < 1440) return `hace ${Math.round(diffMin / 60)}h`
  return `hace ${Math.round(diffMin / 1440)}d`
}

interface NewsItem {
  title: string
  source: string
  timeStr: string
  url?: string
  lang?: string
}

export default function AIPanel({ eventId, isConnected = false, viewportLocation, isKnownEvent = true, zoneSnapshot }: AIPanelProps) {
  const zoneName = zoneSnapshot?.zone.country
  const welcomeContent = buildWelcome(eventId, isKnownEvent, zoneName)
  const [messages, setMessages]           = useState<Message[]>([{ role: 'system', content: welcomeContent }])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [streamedText, setStreamedText]   = useState('')
  const bottomRef                         = useRef<HTMLDivElement>(null)
  const [newsItems, setNewsItems]         = useState<NewsItem[]>([])

  // News reflects the zone in view: a manual zone analysis (ANALIZAR ZONA)
  // takes priority since it's scoped to the exact viewport; otherwise fall
  // back to the known event's news feed, or nothing when browsing elsewhere
  // without an analysis yet.
  useEffect(() => {
    const now = Date.now()

    if (zoneSnapshot) {
      setNewsItems(zoneSnapshot.news.slice(0, 10).map(item => ({
        title: item.title, source: item.source, url: item.url, lang: item.language,
        timeStr: formatRelativeTime(item.publishedAt, now),
      })))
      return
    }

    if (!isKnownEvent) { setNewsItems([]); return }

    fetch(`/api/news?eventId=${eventId}&limit=10`)
      .then(r => r.json())
      .then((d: { items?: { title: string; source: string; publishedAt: number; url: string; language: string }[] }) => {
        const fetchedAt = Date.now()
        setNewsItems((d.items ?? []).map(item => ({
          title: item.title, source: item.source, timeStr: formatRelativeTime(item.publishedAt, fetchedAt), url: item.url, lang: item.language,
        })))
      })
      .catch(() => {})
  }, [eventId, zoneSnapshot, isKnownEvent])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setStreamedText('')

    if (!isConnected) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'system',
          content: `[IA no conectada]\nConfigura OPENROUTER_API_KEY en .env.local para activar el asistente.`,
        }])
        setLoading(false)
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 800)
      return
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
          context: { eventId, viewportLocation, isKnownEvent },
        }),
      })

      if (!res.ok) {
        let errMsg = 'Error del servidor. Intenta de nuevo.'
        try {
          const txt = await res.text()
          const parsed = JSON.parse(txt) as { error?: string }
          if (parsed.error) errMsg = parsed.error
        } catch { /* use default */ }
        setMessages(prev => [...prev, { role: 'system', content: errMsg }])
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setStreamedText(full)
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }

      setMessages(prev => [...prev, { role: 'system', content: full || 'Sin respuesta del modelo.' }])
      setStreamedText('')
    } catch {
      setMessages(prev => [...prev, { role: 'system', content: 'Error de conexión. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div style={{
      width: 340,
      height: '100%',
      backgroundColor: 'var(--color-panel)',
      borderLeft: '1px solid var(--color-slate)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>

      {/* Header */}
      <div style={{ padding: '0.625rem 0.875rem', borderBottom: '1px solid var(--color-slate)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>
          INTELIGENCIA ARTIFICIAL
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.8125rem', color: 'var(--color-green)', letterSpacing: '0.06em' }}>
            GeoVigil Intelligence Core
          </span>
          <span style={{
            fontFamily: 'var(--font-hud)',
            fontSize: '0.5625rem',
            color: isConnected ? 'var(--color-green)' : 'var(--color-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: isConnected ? 'var(--color-green)' : 'var(--color-muted)',
              boxShadow: isConnected ? '0 0 6px var(--color-green)' : 'none',
            }} />
            {isConnected ? 'ONLINE' : 'DEMO'}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>
          Gemini 2.0 Flash · OpenRouter
        </div>
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.625rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            borderLeft: `2px solid ${msg.role === 'user' ? 'var(--color-cyan)' : 'var(--color-green)'}`,
            paddingLeft: '0.625rem',
          }}>
            <div style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.5625rem',
              color: msg.role === 'user' ? 'var(--color-cyan)' : 'var(--color-green)',
              marginBottom: '0.25rem',
              letterSpacing: '0.1em',
            }}>
              {msg.role === 'user' ? 'OPERADOR' : 'SISTEMA'}
            </div>
            <div style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.8125rem',
              color: 'var(--color-text)',
              lineHeight: 1.65,
              whiteSpace: 'pre-line',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && streamedText && (
          <div style={{ borderLeft: '2px solid var(--color-green)', paddingLeft: '0.625rem' }}>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-green)', marginBottom: '0.25rem', letterSpacing: '0.1em' }}>
              SISTEMA
            </div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.8125rem', color: 'var(--color-text)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
              {streamedText}
            </div>
          </div>
        )}

        {loading && !streamedText && (
          <div style={{ borderLeft: '2px solid var(--color-green)', paddingLeft: '0.625rem' }}>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-green)', marginBottom: '0.25rem', letterSpacing: '0.1em' }}>SISTEMA</div>
            <span style={{ color: 'var(--color-green)', animation: 'blink 1s step-end infinite' }}>▮</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested queries */}
      <div style={{ padding: '0.5rem 0.875rem', borderTop: '1px solid var(--color-slate)', display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.12em', marginBottom: '0.125rem' }}>
          CONSULTAS RÁPIDAS
        </div>
        {buildSuggested(isKnownEvent, zoneName).map(q => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={loading}
            style={{
              textAlign: 'left',
              background: 'none',
              border: '1px solid var(--color-slate)',
              padding: '0.3125rem 0.625rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-hud)',
              fontSize: '0.6875rem',
              color: 'var(--color-muted)',
              transition: 'all 0.15s',
              opacity: loading ? 0.4 : 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--color-green)'
              e.currentTarget.style.borderColor = 'var(--color-green)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--color-muted)'
              e.currentTarget.style.borderColor = 'var(--color-slate)'
            }}
          >
            › {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '0.5rem 0.875rem',
        borderTop: '1px solid var(--color-slate)',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        flexShrink: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
      }}>
        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.875rem', color: 'var(--color-cyan)', flexShrink: 0 }}>›</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          placeholder="Escribe una pregunta..."
          disabled={loading}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-hud)',
            fontSize: '0.8125rem',
            color: 'var(--color-text)',
            caretColor: 'var(--color-green)',
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          style={{
            background: 'none',
            border: '1px solid var(--color-green)',
            color: 'var(--color-green)',
            fontFamily: 'var(--font-hud)',
            fontSize: '0.75rem',
            padding: '0.1875rem 0.5rem',
            cursor: 'pointer',
            opacity: loading || !input.trim() ? 0.3 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          ↵
        </button>
      </div>

      {/* News stream */}
      <div style={{
        height: '30%',
        minHeight: 100,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid var(--color-slate)',
        flexShrink: 0,
      }}>
        <NewsStream items={newsItems} />
      </div>
    </div>
  )
}
