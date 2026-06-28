import { NextRequest, NextResponse } from 'next/server'

// Images within ~900m of the coordinate
const BBOX_DEG      = 0.008
const MAINSHOCK_ISO = '2026-06-24T22:04:00.000Z'

export const runtime    = 'nodejs'
export const revalidate = 3600

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat   = parseFloat(searchParams.get('lat') ?? '0')
  const lng   = parseFloat(searchParams.get('lng') ?? '0')
  const phase = searchParams.get('phase') ?? 'after' // 'before' | 'after'

  const token = process.env.MAPILLARY_CLIENT_TOKEN
  if (!token) return NextResponse.json({ images: [] })

  const bbox = [lng - BBOX_DEG, lat - BBOX_DEG, lng + BBOX_DEG, lat + BBOX_DEG].join(',')

  const params = new URLSearchParams({
    access_token: token,
    fields: 'id,thumb_1024_url,captured_at',
    bbox,
    limit: '4',
  })
  if (phase === 'before') params.set('end_captured_at', MAINSHOCK_ISO)
  else                    params.set('start_captured_at', MAINSHOCK_ISO)

  try {
    const res = await fetch(`https://graph.mapillary.com/images?${params}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return NextResponse.json({ images: [] })
    const data = await res.json() as { data?: { id: string; thumb_1024_url: string; captured_at: string }[] }
    return NextResponse.json({
      images: (data.data ?? []).map(img => ({
        id:         img.id,
        url:        img.thumb_1024_url,
        capturedAt: img.captured_at,
      })),
    })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
