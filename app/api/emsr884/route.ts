import { NextResponse } from 'next/server'
import type { Emsr884Activation } from '@/lib/emsr884'
import { extractVtLayers } from '@/lib/emsr884'

export const revalidate = 3600

const BACKEND = 'https://rapidmapping.emergency.copernicus.eu'

interface BackendResponse {
  results?: Emsr884Activation[]
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
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      console.warn(`[EMSR884] API returned ${res.status}`)
      return NextResponse.json({ activation: null, vtLayers: [], error: `API ${res.status}` })
    }

    const data: unknown = await res.json()

    if (!isBackendResponse(data) || !Array.isArray(data.results) || data.results.length === 0) {
      return NextResponse.json({ activation: null, vtLayers: [], error: 'No results' })
    }

    const activation = data.results[0]
    const vtLayers   = extractVtLayers(activation)

    return NextResponse.json({
      activation,
      vtLayers,
      lastUpdated: Date.now(),
    })
  } catch (err) {
    console.warn('[EMSR884] Fetch failed:', err)
    return NextResponse.json({ activation: null, vtLayers: [], error: String(err) })
  }
}
