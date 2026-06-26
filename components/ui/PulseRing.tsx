'use client'

interface PulseRingProps {
  magnitude: number
  size?: number
  color?: string
  className?: string
}

function getRingConfig(magnitude: number): { color: string; duration: number; rings: number } {
  if (magnitude >= 7.0) return { color: 'var(--color-red)',   duration: 0.8, rings: 3 }
  if (magnitude >= 6.0) return { color: 'var(--color-red)',   duration: 1.0, rings: 3 }
  if (magnitude >= 5.0) return { color: 'var(--color-red)',   duration: 1.5, rings: 2 }
  if (magnitude >= 4.0) return { color: 'var(--color-amber)', duration: 2.5, rings: 2 }
  if (magnitude >= 3.0) return { color: 'var(--color-amber)', duration: 3.5, rings: 1 }
  return { color: 'var(--color-muted)', duration: 0, rings: 0 }
}

export default function PulseRing({ magnitude, size = 16, color, className = '' }: PulseRingProps) {
  const config = getRingConfig(magnitude)
  const ringColor = color ?? config.color

  if (config.rings === 0) {
    return (
      <div className={className} style={{
        width: size, height: size, borderRadius: '50%',
        backgroundColor: ringColor, opacity: 0.6,
      }} />
    )
  }

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }}>
      {Array.from({ length: config.rings }).map((_, i) => (
        <span key={i} style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px solid ${ringColor}`,
          animation: `pulse-ring ${config.duration}s ease-out ${i * (config.duration / config.rings)}s infinite`,
          boxShadow: `0 0 4px ${ringColor}`,
        }} />
      ))}
      <span style={{
        position: 'absolute',
        inset: '25%',
        borderRadius: '50%',
        backgroundColor: ringColor,
        boxShadow: `0 0 8px ${ringColor}`,
      }} />
    </div>
  )
}
