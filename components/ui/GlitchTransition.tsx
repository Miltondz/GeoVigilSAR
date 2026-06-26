'use client'

import { useEffect, useRef, useState } from 'react'

interface GlitchTransitionProps {
  trigger: string | number | boolean
  children: React.ReactNode
  className?: string
}

export default function GlitchTransition({ trigger, children, className = '' }: GlitchTransitionProps) {
  const [glitching, setGlitching] = useState(false)
  const prevTrigger = useRef(trigger)

  useEffect(() => {
    if (prevTrigger.current !== trigger) {
      prevTrigger.current = trigger
      setGlitching(true)
      const t = setTimeout(() => setGlitching(false), 220)
      return () => clearTimeout(t)
    }
  }, [trigger])

  return (
    <div className={`${className} ${glitching ? 'glitch-active' : ''}`}>
      {children}
    </div>
  )
}
