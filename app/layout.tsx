import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GeoVigil SAR — Situational Intelligence',
  description: 'Real-time geospatial dashboard for earthquake emergencies. Venezuela Mw 7.5 — June 2026.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
