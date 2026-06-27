import { type NextRequest, NextResponse } from 'next/server'
import { getCdseToken } from '@/lib/copernicus'

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <rect width="200" height="200" fill="#001A24"/>
  <text x="100" y="100" text-anchor="middle" fill="#607080" font-family="monospace" font-size="12">NO PREVIEW</text>
</svg>`

function placeholder(): NextResponse {
  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const productId = req.nextUrl.searchParams.get('productId')
  if (!productId) return placeholder()

  const token = await getCdseToken()
  if (!token) return placeholder()

  try {
    const url =
      `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${productId})/Nodes('quicklook.png')/$value`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) return placeholder()

    const contentType = res.headers.get('Content-Type') ?? 'image/jpeg'
    const body = await res.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return placeholder()
  }
}
