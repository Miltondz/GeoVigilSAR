'use client'

export interface DateRange {
  start: string // ISO date string yyyy-mm-dd
  end: string
}

interface DateFilterProps {
  value: DateRange
  minDate?: string
  onChange: (v: DateRange) => void
}

const INPUT: React.CSSProperties = {
  background:   'rgba(0,10,15,0.85)',
  border:       '1px solid var(--color-slate)',
  color:        'var(--color-cyan)',
  fontFamily:   'var(--font-hud)',
  fontSize:     '0.5rem',
  padding:      '0.15rem 0.3rem',
  outline:      'none',
  cursor:       'pointer',
  colorScheme:  'dark',
  letterSpacing: '0.05em',
  width: 86,
}

export default function DateFilter({ value, minDate = '2026-06-24', onChange }: DateFilterProps) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      <span style={{
        fontFamily:    'var(--font-hud)',
        fontSize:      '0.4375rem',
        color:         'var(--color-muted)',
        letterSpacing: '0.12em',
        whiteSpace:    'nowrap',
      }}>
        RANGO
      </span>

      <input
        type="date"
        value={value.start}
        min={minDate}
        max={value.end}
        onChange={e => onChange({ ...value, start: e.target.value })}
        style={INPUT}
      />

      <span style={{ color: 'var(--color-slate)', fontFamily: 'var(--font-hud)', fontSize: '0.5rem' }}>
        →
      </span>

      <input
        type="date"
        value={value.end}
        min={value.start}
        max={today}
        onChange={e => onChange({ ...value, end: e.target.value })}
        style={INPUT}
      />
    </div>
  )
}
