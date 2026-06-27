'use client'

import { VEN_2406 } from '@/lib/events/ven-2406'

interface TimelineEvent {
  date: string
  label: string
  type: 'pre' | 'mainEvent' | 'post'
}

interface TimelineSliderProps {
  events: TimelineEvent[]
  value: number
  onChange: (value: number) => void
}

const typeColor: Record<TimelineEvent['type'], string> = {
  pre:       'var(--color-muted)',
  mainEvent: 'var(--color-red)',
  post:      'var(--color-cyan)',
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms)
  const day   = d.getUTCDate().toString().padStart(2, '0')
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  const hh    = d.getUTCHours().toString().padStart(2, '0')
  const min   = d.getUTCMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${hh}:${min} UTC`
}

function valueToMs(value: number, events: TimelineEvent[]): number {
  if (events.length < 2) {
    // fallback: slider spans ±36 days around mainShockTime
    const span = 36 * 24 * 3600 * 1000
    return VEN_2406.mainShockTime - span + (value / 100) * span * 2
  }
  const startMs = new Date(events[0].date + 'T00:00:00Z').getTime()
  const endMs   = new Date(events[events.length - 1].date + 'T00:00:00Z').getTime()
  return startMs + (value / 100) * (endMs - startMs)
}

type Phase = 'pre' | 'main' | 'post'

function getPhase(value: number): Phase {
  if (value < 40) return 'pre'
  if (value <= 60) return 'main'
  return 'post'
}

const phaseLabel: Record<Phase, string> = {
  pre:  'PRE-EVENTO',
  main: 'EVENTO PRINCIPAL',
  post: 'POST-EVENTO',
}

const phaseColor: Record<Phase, string> = {
  pre:  'var(--color-green)',
  main: 'var(--color-red)',
  post: 'var(--color-amber)',
}

export default function TimelineSlider({ events, value, onChange }: TimelineSliderProps) {
  const phase     = getPhase(value)
  const label     = phaseLabel[phase]
  const color     = phaseColor[phase]
  const timestamp = formatTimestamp(valueToMs(value, events))

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0 1rem',
      height: '100%',
    }}>
      {/* Dynamic phase label replaces static PRE ◄ */}
      <span style={{
        fontFamily: 'var(--font-hud)',
        fontSize: '0.45rem',
        color,
        letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
        minWidth: 90,
        animation: phase === 'main' ? 'hud-pulse 1s ease-in-out infinite' : 'none',
      }}>
        {label}
      </span>

      <div style={{ position: 'relative', flex: 1, height: 36, display: 'flex', alignItems: 'center' }}>
        {/* Absolute timestamp above thumb */}
        <div style={{
          position: 'absolute',
          left: `${value}%`,
          top: 0,
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-hud)',
          fontSize: '0.4rem',
          color: 'var(--color-text)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 6,
          letterSpacing: '0.05em',
        }}>
          {timestamp}
        </div>

        {/* Track */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: 2,
          backgroundColor: 'var(--color-slate)',
          transform: 'translateY(calc(-50% + 4px))',
        }} />

        {/* Event markers with tooltip via title attribute */}
        {events.map((evt, i) => {
          const pct = events.length > 1 ? (i / (events.length - 1)) * 100 : 50
          return (
            <div
              key={evt.date}
              title={`${evt.label} · ${evt.date}`}
              style={{
                position: 'absolute',
                left: `${pct}%`,
                top: '50%',
                transform: 'translateX(-50%) translateY(calc(-50% + 4px))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                cursor: 'default',
              }}
            >
              <div style={{
                width: evt.type === 'mainEvent' ? 8 : 5,
                height: evt.type === 'mainEvent' ? 8 : 5,
                borderRadius: '50%',
                backgroundColor: typeColor[evt.type],
                boxShadow: evt.type === 'mainEvent' ? `0 0 8px ${typeColor[evt.type]}` : 'none',
              }} />
              <span style={{
                fontFamily: 'var(--font-hud)',
                fontSize: '0.4rem',
                color: typeColor[evt.type],
                whiteSpace: 'nowrap',
                letterSpacing: '0.05em',
              }}>
                {evt.label}
              </span>
            </div>
          )
        })}

        {/* Invisible range input — must be on top */}
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            width: '100%',
            opacity: 0,
            cursor: 'pointer',
            height: '100%',
            zIndex: 10,
          }}
        />

        {/* Visible thumb */}
        <div style={{
          position: 'absolute',
          left: `${value}%`,
          top: '50%',
          transform: 'translateX(-50%) translateY(calc(-50% + 4px))',
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: 'var(--color-green)',
          boxShadow: '0 0 8px var(--color-green)',
          pointerEvents: 'none',
          zIndex: 5,
        }} />
      </div>

      <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-cyan)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
        ► POST
      </span>
    </div>
  )
}
