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
  const productId   = req.nextUrl.searchParams.get('productId')
  const productName = req.nextUrl.searchParams.get('name') // e.g. "S2B_MSIL2A_..._....SAFE"
  if (!productId || !productName) return placeholder()

  const token = await getCdseToken()
  if (!token) return placeholder()

  try {
    // CDSE nests the quicklook one level inside the product's own .SAFE folder
    // node, named "<product>-ql.jpg" — not a flat "quicklook.png" at the root.
    // File downloads ($value) must go through the download subdomain, not
    // catalogue (catalogue is metadata/search-only and 401s on $value).
    const quicklookName = productName.replace(/\.SAFE$/, '') + '-ql.jpg'
    const url =
      `https://download.dataspace.copernicus.eu/odata/v1/Products(${productId})` +
      `/Nodes(${encodeURIComponent(productName)})/Nodes(${encodeURIComponent(quicklookName)})/$value`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) return placeholder()

    // The $value endpoint reports application/zip generically regardless of
    // the actual file type — trust the .jpg extension we asked for instead.
    const body = await res.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return placeholder()
  }
}
