import { NextResponse } from 'next/server'

export const revalidate = 3600

const BACKEND = 'https://rapidmapping.emergency.copernicus.eu'

interface EmsrProduct {
  type: string
  monitoring: boolean
  monitoringNumber?: number
  feasible: boolean
  activationCode?: string
  aoiName?: string
  aoiNumber?: string
  expectedDelivery?: string
  downloadPath?: string
  layers?: { name: string; type: string }[]
  stats?: Record<string, unknown>
}

interface EmsrAoi {
  number: number
  name: string
  extent?: string
  blpPath?: string
  activationCode?: string
  products?: EmsrProduct[]
}

interface EmsrActivation {
  code: string
  name: string
  reason?: string
  category?: string
  activator?: string
  eventTime?: string
  activationTime?: string
  continent?: string
  countries?: { name: string }[]
  aws_bucket?: string
  productsPath?: string
  closed?: boolean
  gdacsId?: string
  centroid?: string
  infobulletins?: string[]
  stats?: Record<string, unknown>
  aois?: EmsrAoi[]
}

interface BackendResponse {
  results?: EmsrActivation[]
}

function isBackendResponse(v: unknown): v is BackendResponse {
  return typeof v === 'object' && v !== null
}

export async function GET() {
  try {
    const url = `${BACKEND}/backend/dashboard-api/public-activations/?code=EMSR884`
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(15_000),
      headers: { 'Accept': 'application/json' },
    })

    if (!res.ok) {
      console.warn(`[EMSR884] API returned ${res.status}`)
      return NextResponse.json({ activation: null, error: `API ${res.status}` })
    }

    const data: unknown = await res.json()

    if (!isBackendResponse(data) || !Array.isArray(data.results) || data.results.length === 0) {
      return NextResponse.json({ activation: null, error: 'No results' })
    }

    const activation = data.results[0]
    return NextResponse.json({ activation, lastUpdated: Date.now() })
  } catch (err) {
    console.warn('[EMSR884] Fetch failed:', err)
    return NextResponse.json({ activation: null, error: String(err) })
  }
}
