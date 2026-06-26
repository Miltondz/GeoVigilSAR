'use client'

import { useRef, useState } from 'react'
import NewsStream from './NewsStream'
import { MOCK_NEWS } from '@/lib/mock-data'

interface Message {
  role: 'system' | 'user'
  content: string
}

interface AIPanelProps {
  eventId: string
  isConnected?: boolean
}

const SUGGESTED = [
  '¿Qué zonas tienen mayor riesgo de réplica?',
  '¿Qué reportan medios sobre La Guaira?',
  '¿Cuántos rescatados en Caracas?',
]

const WELCOME: Message = {
  role: 'system',
  content: `Listo. Evento VEN-2406 cargado.\n138 réplicas indexadas.\nFuentes activas: USGS, GDELT, ReliefWeb, Copernicus EMS.`,
}

export default function AIPanel({ eventId, isConnected = false }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setStreamedText('')

    if (!isConnected) {
      // Phase 1: simulate response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'system',
          content: `[IA no conectada — API key pendiente]\nModo demo: pregunta registrada.\nConecta ANTHROPIC_API_KEY en .env.local para activar.`,
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
          history: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
          context: { eventId },
        }),
      })

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

      setMessages(prev => [...prev, { role: 'system', content: full }])
      setStreamedText('')
    } catch {
      setMessages(prev => [...prev, { role: 'system', content: 'Error del sistema. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div style={{
      width: 320,
      height: '100%',
      backgroundColor: 'var(--color-panel)',
      borderLeft: '1px solid var(--color-slate)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-slate)' }}>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.15em' }}>
          SISTEMA / SYSTEM
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.125rem' }}>
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-green)' }}>
            GeoVigil Intelligence Core
          </span>
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: isConnected ? 'var(--color-green)' : 'var(--color-muted)' }}>
            {isConnected ? '● ONLINE' : '○ DEMO'}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>
          Modelo: claude-sonnet-4-6
        </div>
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: msg.role === 'user' ? 'var(--color-cyan)' : 'var(--color-green)', marginBottom: '0.125rem', letterSpacing: '0.1em' }}>
              {msg.role === 'user' ? 'USUARIO >' : 'SISTEMA >'}
            </div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && streamedText && (
          <div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-green)', marginBottom: '0.125rem', letterSpacing: '0.1em' }}>
              SISTEMA &gt;
            </div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {streamedText}
            </div>
          </div>
        )}

        {loading && !streamedText && (
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-muted)' }}>
            SISTEMA &gt; <span className="hud-cursor" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested queries */}
      <div style={{ padding: '0.375rem 0.75rem', borderTop: '1px solid var(--color-slate)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {SUGGESTED.map(q => (
          <button key={q} onClick={() => send(q)} style={{
            textAlign: 'left',
            background: 'none',
            border: '1px solid var(--color-slate)',
            padding: '0.2rem 0.5rem',
            cursor: 'pointer',
            fontFamily: 'var(--font-hud)',
            fontSize: '0.5rem',
            color: 'var(--color-muted)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = 'var(--color-green)'; (e.target as HTMLButtonElement).style.borderColor = 'var(--color-green)' }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = 'var(--color-muted)'; (e.target as HTMLButtonElement).style.borderColor = 'var(--color-slate)' }}
          >
            &gt; {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--color-slate)', display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.625rem', color: 'var(--color-cyan)' }}>&gt;</span>
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
            fontSize: '0.625rem',
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
            fontSize: '0.5rem',
            padding: '0.125rem 0.375rem',
            cursor: 'pointer',
            opacity: loading || !input.trim() ? 0.3 : 1,
          }}
        >
          ↵
        </button>
      </div>

      {/* News stream */}
      <div style={{ height: '35%', minHeight: 120, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--color-slate)' }}>
        <NewsStream items={MOCK_NEWS} />
      </div>
    </div>
  )
}
