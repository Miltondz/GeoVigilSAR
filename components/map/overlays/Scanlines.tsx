'use client'

export default function Scanlines() {
  return (
    <div
      className="scanlines"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  )
}
