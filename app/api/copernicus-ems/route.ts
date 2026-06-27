import { NextResponse } from 'next/server'
import { fetchEmsActivations } from '@/lib/copernicus-ems'

export const revalidate = 3600

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country') ?? 'Venezuela'

  try {
    const activations = await fetchEmsActivations(country)
    const hasActive = activations.some(
      a => a.status.toLowerCase().includes('ongoing') || a.status.toLowerCase().includes('active')
    )

    return NextResponse.json({
      activations,
      hasActive,
      count: activations.length,
      lastUpdated: Date.now(),
    })
  } catch {
    return NextResponse.json({
      activations: [],
      hasActive: false,
      count: 0,
      lastUpdated: Date.now(),
    })
  }
}
