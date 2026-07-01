import type { Polygon } from 'geojson'

// ─── Token cache (server-side in-memory, valid 30 min) ───────────────────────
interface CdseToken {
  value: string
  expiresAt: number
}

let tokenCache: CdseToken | null = null

export async function getCdseToken(): Promise<string> {
  const username = process.env.COPERNICUS_USERNAME
  const password = process.env.COPERNICUS_PASSWORD
  if (!username || !password) return ''

  // Return cached token if still valid (with 60s margin)
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.value
  }

  try {
    const res = await fetch(
      'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          username,
          password,
          client_id: 'cdse-public',
        }).toString(),
        signal: AbortSignal.timeout(10_000),
      }
    )
    if (!res.ok) return ''
    const data = (await res.json()) as { access_token: string; expires_in: number }
    tokenCache = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    }
    return tokenCache.value
  } catch {
    return ''
  }
}

// ─── Product types ────────────────────────────────────────────────────────────
export interface CopernicusProduct {
  id: string
  name: string
  startDate: string       // ISO
  footprint: Polygon      // GeoJSON Polygon
  collection: 'SENTINEL-1' | 'SENTINEL-2'
  productType: string     // GRD, S2MSI2A, etc.
  quicklookUrl: string    // /api/image-proxy?productId={id}
  bbox: [number, number, number, number]  // [west, south, east, north]
  cloudCover?: number      // percent, Sentinel-2 only
}

// ─── Internal OData response types ───────────────────────────────────────────
interface ODataProduct {
  Id: string
  Name: string
  ContentDate: { Start: string }
  GeoFootprint: Polygon
  S3Path?: string
  Attributes?: { Name: string; Value: number | string }[]
}

interface ODataResponse {
  value: ODataProduct[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function footprintBbox(polygon: Polygon): [number, number, number, number] {
  const coords = polygon.coordinates.flat()
  const lngs = coords.map(c => c[0])
  const lats = coords.map(c => c[1])
  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ]
}

// ─── Product search ───────────────────────────────────────────────────────────
export async function searchProducts(params: {
  collection: 'SENTINEL-1' | 'SENTINEL-2'
  bbox: [number, number, number, number]  // [west, south, east, north]
  startDate: string                        // ISO
  endDate: string                          // ISO
  productType?: string                     // 'GRD' for S1, 'S2MSI2A' for S2
  limit?: number
}): Promise<CopernicusProduct[]> {
  const token = await getCdseToken()
  if (!token) return []

  const { collection, bbox, startDate, endDate, productType, limit = 10 } = params
  const [west, south, east, north] = bbox

  const polygon =
    `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`

  const filters: string[] = [
    `Collection/Name eq '${collection}'`,
    `OData.CSC.Intersects(area=geography'SRID=4326;${polygon}')`,
    `ContentDate/Start gt ${startDate}`,
    `ContentDate/Start lt ${endDate}`,
  ]

  if (productType) {
    filters.push(
      `Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq '${productType}')`
    )
  }

  const url = new URL('https://catalogue.dataspace.copernicus.eu/odata/v1/Products')
  url.searchParams.set('$filter', filters.join(' and '))
  url.searchParams.set('$expand', 'Attributes')
  url.searchParams.set('$top', String(limit))
  url.searchParams.set('$orderby', 'ContentDate/Start desc')

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []

    const data = (await res.json()) as ODataResponse
    return (data.value ?? []).map(p => {
      const cloudAttr = p.Attributes?.find(a => a.Name === 'cloudCover')
      return {
        id: p.Id,
        name: p.Name,
        startDate: p.ContentDate.Start,
        footprint: p.GeoFootprint,
        collection,
        productType: productType ?? '',
        quicklookUrl: `/api/image-proxy?productId=${p.Id}&name=${encodeURIComponent(p.Name)}`,
        bbox: footprintBbox(p.GeoFootprint),
        cloudCover: cloudAttr ? Number(cloudAttr.Value) : undefined,
      }
    })
  } catch {
    return []
  }
}
