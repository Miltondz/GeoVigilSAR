import { NextResponse } from 'next/server'

export const revalidate = 3600

interface RwDisasterFields {
  name?: string
  date?: { created?: string }
  status?: string
  glide?: string
  primary_type?: { name?: string }
}

interface RwDisasterItem {
  id?: number
  fields?: RwDisasterFields
}

function isRwDisasterItem(val: unknown): val is RwDisasterItem {
  return typeof val === 'object' && val !== null
}

interface RwDisastersResponse {
  data?: unknown[]
}

function isRwDisastersResponse(val: unknown): val is RwDisastersResponse {
  return typeof val === 'object' && val !== null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country') ?? 'VEN'

  const body = {
    filter: {
      operator: 'AND',
      conditions: [
        { field: 'country.iso3', value: country },
        { field: 'type.name', value: 'Earthquake' },
      ],
    },
    fields: {
      include: ['name', 'date', 'status', 'glide', 'primary_type'],
    },
    sort: [{ field: 'date.created', direction: 'desc' }],
    limit: 5,
  }

  try {
    const res = await fetch(
      'https://api.reliefweb.int/v1/disasters?appname=geovigil-sar',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) {
      console.warn(`[ReliefWeb Disasters] API returned ${res.status}`)
      return NextResponse.json({ disasters: [], hasActive: false, lastUpdated: Date.now() })
    }

    const data: unknown = await res.json()

    if (!isRwDisastersResponse(data)) {
      return NextResponse.json({ disasters: [], hasActive: false, lastUpdated: Date.now() })
    }

    const rawList = data.data ?? []
    if (!Array.isArray(rawList)) {
      return NextResponse.json({ disasters: [], hasActive: false, lastUpdated: Date.now() })
    }

    const disasters = rawList
      .filter(isRwDisasterItem)
      .map(item => ({
        id: item.id ?? 0,
        name: item.fields?.name ?? '',
        date: item.fields?.date?.created ?? '',
        status: item.fields?.status ?? '',
        glide: item.fields?.glide ?? '',
        type: item.fields?.primary_type?.name ?? 'Earthquake',
      }))

    const hasActive = disasters.some(d =>
      d.status.toLowerCase() === 'current' || d.status.toLowerCase() === 'ongoing'
    )

    return NextResponse.json({
      disasters,
      hasActive,
      count: disasters.length,
      lastUpdated: Date.now(),
    })
  } catch (err) {
    console.warn('[ReliefWeb Disasters] Fetch failed:', err)
    return NextResponse.json({ disasters: [], hasActive: false, count: 0, lastUpdated: Date.now() })
  }
}
