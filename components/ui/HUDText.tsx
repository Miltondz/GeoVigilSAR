'use client'

interface HUDTextProps {
  value: string | number
  label?: string
  variant?: 'green' | 'cyan' | 'red' | 'amber' | 'muted' | 'text'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  mono?: boolean
}

const variantColor: Record<string, string> = {
  green:  'var(--color-green)',
  cyan:   'var(--color-cyan)',
  red:    'var(--color-red)',
  amber:  'var(--color-amber)',
  muted:  'var(--color-muted)',
  text:   'var(--color-text)',
}

const sizeMap: Record<string, string> = {
  xs: '0.625rem',
  sm: '0.75rem',
  md: '0.875rem',
  lg: '1.125rem',
  xl: '1.5rem',
}

export default function HUDText({
  value,
  label,
  variant = 'text',
  size = 'md',
  className = '',
  mono = true,
}: HUDTextProps) {
  return (
    <div className={className} style={{ lineHeight: 1.3 }}>
      {label && (
        <div style={{
          fontFamily: mono ? 'var(--font-hud)' : 'var(--font-body)',
          fontSize: '0.625rem',
          color: 'var(--color-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '0.125rem',
        }}>
          {label}
        </div>
      )}
      <div style={{
        fontFamily: mono ? 'var(--font-hud)' : 'var(--font-headline)',
        fontSize: sizeMap[size],
        color: variantColor[variant],
        letterSpacing: mono ? '0.05em' : '0.02em',
      }}>
        {value}
      </div>
    </div>
  )
}
