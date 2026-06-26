'use client'

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

const typeColor = {
  pre:       'var(--color-muted)',
  mainEvent: 'var(--color-red)',
  post:      'var(--color-cyan)',
}

export default function TimelineSlider({ events, value, onChange }: TimelineSliderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0 1rem',
      height: '100%',
    }}>
      <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
        PRE ◄
      </span>

      <div style={{ position: 'relative', flex: 1, height: 24, display: 'flex', alignItems: 'center' }}>
        {/* Track */}
        <div style={{ position: 'absolute', inset: '0 0 0 0', top: '50%', height: 2, backgroundColor: 'var(--color-slate)', transform: 'translateY(-50%)' }} />

        {/* Event markers */}
        {events.map((evt, i) => {
          const pct = (i / (events.length - 1)) * 100
          return (
            <div key={evt.date} style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: evt.type === 'mainEvent' ? 8 : 5, height: evt.type === 'mainEvent' ? 8 : 5, borderRadius: '50%', backgroundColor: typeColor[evt.type], boxShadow: evt.type === 'mainEvent' ? `0 0 8px ${typeColor[evt.type]}` : 'none' }} />
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4rem', color: typeColor[evt.type], whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
                {evt.label}
              </span>
            </div>
          )
        })}

        {/* Slider input */}
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

        {/* Thumb */}
        <div style={{
          position: 'absolute',
          left: `${value}%`,
          transform: 'translateX(-50%)',
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
