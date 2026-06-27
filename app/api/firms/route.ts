import { NextResponse } from 'next/server'
import type { FirmsFire } from '@/lib/firms'
import { normalizeConfidence } from '@/lib/firms'

export const revalidate = 900

const VEN_BBOX = '-74,0,-59,13'
const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'

function parseCSV(text: string, instrument: 'MODIS' | 'VIIRS'): FirmsFire[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const idx = (name: string) => headers.indexOf(name)
  const results: FirmsFire[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < headers.length) continue
    const lat = parseFloat(cols[idx('latitude')] ?? '')
    const lng = parseFloat(cols[idx('longitude')] ?? '')
    if (isNaN(lat) || isNaN(lng)) continue
    const rawConf = cols[idx('confidence')]?.trim() ?? '0'
    const confidence = normalizeConfidence(rawConf, instrument)
    if (confidence < 30) continue
    const frp = parseFloat(cols[idx('frp')] ?? '0') || 0
    const brightness = parseFloat(
      cols[idx('brightness')] ?? cols[idx('bright_ti4')] ?? '0'
    ) || 0
    const daynight = (cols[idx('daynight')]?.trim() ?? 'D') as 'D' | 'N'
    results.push({
      lat, lng, frp, brightness, confidence,
      acqDate: cols[idx('acq_date')]?.trim() ?? '',
      acqTime: cols[idx('acq_time')]?.trim() ?? '',
      satellite: cols[idx('satellite')]?.trim() ?? instrument,
      daynight,
      instrument,
    })
  }
  return results
}

async function fetchDataset(source: string, instrument: 'MODIS' | 'VIIRS'): Promise<FirmsFire[]> {
  const key = process.env.NASA_FIRMS_MAP_KEY
  if (!key) return []
  try {
    const res = await fetch(`${FIRMS_BASE}/${key}/${source}/${VEN_BBOX}/1`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const text = await res.text()
    return parseCSV(text, instrument)
  } catch {
    return []
  }
}

export async function GET(): Promise<NextResponse> {
  const [modis, viirs] = await Promise.all([
    fetchDataset('MODIS_NRT', 'MODIS'),
    fetchDataset('VIIRS_SNPP_NRT', 'VIIRS'),
  ])
  const fires = [...modis, ...viirs]
  return NextResponse.json(
    { fires, count: fires.length, lastUpdated: Date.now() },
    { headers: { 'Cache-Control': 'public, s-maxage=900' } }
  )
}
