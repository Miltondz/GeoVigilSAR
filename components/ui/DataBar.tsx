'use client'

interface DataBarProps {
  value: number
  max: number
  label: string
  displayValue?: string
  color?: 'green' | 'red' | 'amber' | 'cyan'
  className?: string
}

const colorMap: Record<string, string> = {
  green: 'var(--color-green)',
  red:   'var(--color-red)',
  amber: 'var(--color-amber)',
  cyan:  'var(--color-cyan)',
}

export default function DataBar({
  value,
  max,
  label,
  displayValue,
  color = 'green',
  className = '',
}: DataBarProps) {
  const pct = Math.min(100, (value / max) * 100)
  const barColor = colorMap[color]
  const display = displayValue ?? value.toLocaleString()

  return (
    <div className={className} style={{ marginBottom: '0.75rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '0.25rem',
      }}>
        <span style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.625rem',
          color: 'var(--color-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.875rem',
          color: barColor,
          letterSpacing: '0.05em',
        }}>
          {display}
        </span>
      </div>
      <div style={{
        height: '4px',
        backgroundColor: 'var(--color-slate)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: barColor,
          borderRadius: '2px',
          boxShadow: `0 0 6px ${barColor}`,
          transition: 'width 1s ease',
        }} />
      </div>
    </div>
  )
}
