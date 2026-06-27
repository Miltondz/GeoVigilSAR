// Aircraft icon registration for MapLibre GL JS
// Icons are created as 24x24 SVG → HTMLImageElement → map.addImage

import type { Map as MapLibreMap } from 'maplibre-gl'
import type { EmitterCategory } from '@/lib/opensky'

// HUD palette constants (matches CSS custom properties)
const CYAN  = '#00B4FF'
const AMBER = '#FFB800'
const GREEN = '#00FF88'

const SVG_SIZE = 24

function makeSVG(body: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_SIZE}" height="${SVG_SIZE}" viewBox="0 0 24 24">
    ${body.replace(/COLOR/g, color)}
  </svg>`
}

// Generic aircraft — filled triangle pointing up
const AIRCRAFT_BODY = `
  <polygon points="12,2 20,20 12,16 4,20" fill="COLOR" opacity="0.9"/>
`

// Rotorcraft — circle with cross blades
const ROTORCRAFT_BODY = `
  <circle cx="12" cy="12" r="5" fill="none" stroke="COLOR" stroke-width="2"/>
  <line x1="12" y1="2" x2="12" y2="22" stroke="COLOR" stroke-width="1.5"/>
  <line x1="2" y1="12" x2="22" y2="12" stroke="COLOR" stroke-width="1.5"/>
`

// UAV/drone — diamond
const UAV_BODY = `
  <polygon points="12,3 21,12 12,21 3,12" fill="COLOR" opacity="0.85"/>
`

function svgToImage(svgStr: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const img  = new Image(SVG_SIZE, SVG_SIZE)
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('svg load failed')) }
    img.src = url
  })
}

export async function registerAircraftIcons(map: MapLibreMap): Promise<void> {
  const icons: Array<{ name: string; svg: string; color: string }> = [
    { name: 'icon-aircraft',   svg: AIRCRAFT_BODY,   color: CYAN  },
    { name: 'icon-rotorcraft', svg: ROTORCRAFT_BODY, color: AMBER },
    { name: 'icon-uav',        svg: UAV_BODY,        color: GREEN },
  ]

  for (const { name, svg, color } of icons) {
    if (map.hasImage(name)) continue // guard re-mount
    try {
      const img = await svgToImage(makeSVG(svg, color))
      if (!map.hasImage(name)) {
        map.addImage(name, img)
      }
    } catch {
      // Icon registration failure is non-fatal — layer renders without icon
    }
  }
}

export function categoryToIcon(category: EmitterCategory): string {
  switch (category) {
    case 'ROTORCRAFT':
    case 'HIGH_PERF':
      return 'icon-rotorcraft'
    case 'UAV':
      return 'icon-uav'
    default:
      return 'icon-aircraft'
  }
}
