'use client'

export type VisionMode = 'NORMAL' | 'FLIR' | 'NVG' | 'CRT'

interface VisionModeOverlayProps {
  mode: VisionMode
}

export default function VisionModeOverlay({ mode }: VisionModeOverlayProps) {
  const className =
    mode === 'NORMAL'
      ? 'vision-mode-overlay'
      : `vision-mode-overlay vision-${mode.toLowerCase()}`

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    />
  )
}
