'use client'

interface EarthquakeRow {
  id: string
  magnitude: number
  depth: number
  lat: number
  lng: number
  time: number
  place: string
  classification: string
}

// Export earthquake data as CSV download
export function exportEarthquakesCSV(earthquakes: EarthquakeRow[], eventId: string) {
  const header = 'id,magnitude,depth_km,lat,lng,time_utc,place,classification'
  const rows = earthquakes.map(q =>
    `${q.id},${q.magnitude},${q.depth.toFixed(1)},${q.lat.toFixed(4)},${q.lng.toFixed(4)},${new Date(q.time).toISOString()},"${q.place.replace(/"/g, '""')}",${q.classification}`
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `geovigil-${eventId}-earthquakes-${datestamp()}.csv`)
}

// Export map canvas as PNG using MapLibre's built-in canvas
export function exportMapPNG(mapCanvas: HTMLCanvasElement, eventId: string) {
  mapCanvas.toBlob(blob => {
    if (!blob) return
    downloadBlob(blob, `geovigil-${eventId}-map-${datestamp()}.png`)
  }, 'image/png')
}

// Export visible stats as JSON
export function exportStatsJSON(
  stats: Record<string, unknown>,
  eventId: string
) {
  const blob = new Blob([JSON.stringify({ eventId, exportedAt: new Date().toISOString(), ...stats }, null, 2)], {
    type: 'application/json',
  })
  downloadBlob(blob, `geovigil-${eventId}-stats-${datestamp()}.json`)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function datestamp() {
  return new Date().toISOString().slice(0, 10)
}
