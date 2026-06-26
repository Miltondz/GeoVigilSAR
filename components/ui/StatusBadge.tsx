'use client'

import { useEffect, useState } from 'react'

interface StatusBadgeProps {
  status: 'live' | 'warning' | 'offline'
  label?: string
}

const config = {
  live:    { color: 'var(--color-green)', text: 'EN VIVO' },
  warning: { color: 'var(--color-amber)', text: 'ADVERTENCIA' },
  offline: { color: 'var(--color-muted)', text: 'OFFLINE' },
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const [pulse, setPulse] = useState(true)
  const { color, text } = config[status]

  useEffect(() => {
    if (status !== 'live') return
    const id = setInterval(() => setPulse(p => !p), 1000)
    return () => clearInterval(id)
  }, [status])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <span style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: pulse && status === 'live' ? `0 0 8px ${color}` : 'none',
        transition: 'box-shadow 0.5s ease',
      }} />
      <span style={{
        fontFamily: 'var(--font-hud)',
        fontSize: '0.625rem',
        color,
        letterSpacing: '0.15em',
      }}>
        {label ?? text}
      </span>
    </div>
  )
}
